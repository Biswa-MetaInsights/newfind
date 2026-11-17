#!/usr/bin/env python3
"""Sync visit.brussels / agenda.brussels Open Data into NewFind's event service.

The sync is opt-in: run it manually after configuring the provider endpoint and
reviewing the applicable Open Data licence. The provider's updates endpoint
covers the preceding 24 hours, so schedule incremental runs more frequently
than once per day once the feed is approved for production.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import requests

SOURCE = "agenda_brussels"
DEFAULT_API_BASE = "https://apidata.brussels"
DEFAULT_DELETE_URL = "https://api.agenda.be/events/deletes"
DEFAULT_EVENT_SERVICE_URL = "http://localhost:8003"
DEFAULT_ORGANIZER_ID = "00000000-0000-0000-0000-000000000099"
DEFAULT_PAGE_SIZE = 100
DEFAULT_REQUEST_DELAY = 0.5
DEFAULT_STATE_FILE = "backend/scripts/.state/agenda_brussels_sync_state.json"
DEFAULT_DURATION_HOURS = 3

logger = logging.getLogger("sync_agenda_brussels")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_datetime(value: Any) -> datetime | None:
    """Parse common ISO/date and Unix timestamp forms into naive UTC for SQL."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        # APIs commonly return milliseconds; Unix seconds are 10 digits.
        seconds = value / 1000 if value > 10_000_000_000 else value
        return datetime.fromtimestamp(seconds, tz=timezone.utc).replace(tzinfo=None)
    if isinstance(value, dict):
        value = value.get("dateTime") or value.get("datetime") or value.get("date") or value.get("value")
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def pick(obj: Any, *paths: str) -> Any:
    """Return the first non-empty value found at one of the dotted paths."""
    for path in paths:
        current = obj
        for component in path.split("."):
            if isinstance(current, dict):
                current = current.get(component)
            else:
                current = None
                break
        if current is not None and current != "":
            return current
    return None


def collection_from(payload: Any) -> list[dict[str, Any]]:
    """Handle the list and common envelope shapes used by the provider API."""
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("events", "data", "items", "results", "result", "deletes", "deleted_events"):
        value = payload.get(key)
        if isinstance(value, list):
            return [row for row in value if isinstance(row, dict)]
        if isinstance(value, dict):
            nested = collection_from(value)
            if nested:
                return nested
    return []


def page_count_from(payload: Any) -> int | None:
    if not isinstance(payload, dict):
        return None
    for key in ("pages", "total_pages", "totalPages", "page_count"):
        value = payload.get(key)
        if isinstance(value, int) and value >= 0:
            return value
    for key in ("pagination", "page", "meta"):
        value = payload.get(key)
        if isinstance(value, dict):
            count = page_count_from(value)
            if count is not None:
                return count
    return None


def labels(value: Any) -> list[str]:
    if value is None:
        return []
    values = value if isinstance(value, list) else [value]
    result = []
    for item in values:
        if isinstance(item, dict):
            item = item.get("label") or item.get("name") or item.get("title") or item.get("value")
        if isinstance(item, str) and item.strip():
            result.append(item.strip())
    return list(dict.fromkeys(result))


def first_media_url(event: dict[str, Any]) -> str | None:
    value = pick(event, "image_url", "image", "main_image", "thumbnail", "media")
    candidates = value if isinstance(value, list) else [value]
    for candidate in candidates:
        if isinstance(candidate, dict):
            candidate = candidate.get("url") or candidate.get("src") or candidate.get("large")
        if isinstance(candidate, str) and candidate.startswith(("https://", "http://")):
            return resize_agenda_image(candidate)
    return None


def resize_agenda_image(url: str) -> str:
    """Use the provider's documented CDN resizing so NewFind fetches thumbnails."""
    parts = urlsplit(url)
    if not (parts.hostname or "").endswith("agenda.be"):
        return url
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.setdefault("w", "1200")
    query.setdefault("h", "675")
    query.setdefault("zc", "1")
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def event_location(event: dict[str, Any]) -> dict[str, Any]:
    place = pick(event, "place", "venue", "location")
    place_label = place.strip() if isinstance(place, str) and place.strip() else None
    if not isinstance(place, dict):
        place = {}
    location: dict[str, Any] = {}
    fields = {
        "name": ("place.name", "venue.name", "location.name"),
        "address": ("address", "place.address", "venue.address", "location.address"),
        "postal_code": ("zip", "zipcode", "postal_code", "place.zip", "place.postal_code"),
        "city": ("city", "place.city", "venue.city", "location.city"),
        "country": ("country", "place.country", "venue.country", "location.country"),
        "region": ("region", "place.region", "venue.region", "location.region"),
    }
    for target, paths in fields.items():
        value = pick(event, *paths)
        if value is None:
            continue
        if isinstance(value, dict):
            value = value.get("name") or value.get("label") or value.get("value")
        if value is not None:
            location[target] = str(value)
    latitude = pick(event, "latitude", "lat", "place.latitude", "place.lat", "location.latitude", "location.lat", "coordinates.latitude")
    longitude = pick(event, "longitude", "lng", "lon", "place.longitude", "place.lng", "location.longitude", "location.lng", "coordinates.longitude")
    try:
        if latitude is not None and longitude is not None:
            location["latitude"] = float(latitude)
            location["longitude"] = float(longitude)
    except (TypeError, ValueError):
        pass
    if place_label and not location.get("name"):
        location["name"] = place_label
    if not location:
        location["name"] = "Brussels"
    return location


def normalize_event(raw: dict[str, Any]) -> dict[str, Any] | None:
    external_id = pick(raw, "id", "event_id", "eventId", "uuid", "identifier")
    title = pick(raw, "title", "name", "label")
    if external_id is None or not isinstance(title, str) or len(title.strip()) < 5:
        return None

    start_value = pick(
        raw, "start_date", "date_start", "start", "startDate",
        "dates.start.dateTime", "dates.start.date", "date.start",
        "date_happening", "happening.start", "beginning",
    )
    start = parse_datetime(start_value)
    if start is None:
        return None
    end = parse_datetime(pick(
        raw, "end_date", "date_end", "end", "endDate",
        "dates.end.dateTime", "dates.end.date", "date.end",
        "happening.end", "ending",
    ))
    if end is None or end <= start:
        end = start + timedelta(hours=DEFAULT_DURATION_HOURS)

    category_values = labels(pick(raw, "category", "main_category", "categories", "mainCategory"))
    category = (category_values[0] if category_values else "Culture")[:100]
    event_tags = labels(pick(raw, "tags", "keywords", "other_categories", "subcategories"))
    languages = labels(pick(raw, "language", "languages", "languages_spoken", "spoken_languages"))
    price_value = pick(raw, "price", "price_min", "admission_fee", "ticket_price")
    if isinstance(price_value, dict):
        price_value = price_value.get("min") or price_value.get("amount") or price_value.get("value")
    try:
        price = float(price_value or 0)
    except (TypeError, ValueError):
        price = 0.0

    description = pick(raw, "description", "summary", "intro", "info", "teaser")
    website = pick(raw, "url", "event_url", "website", "permalink", "link")
    language = languages[0] if languages else "French"

    return {
        "organizer_id": os.environ.get("AGENDA_BRUSSELS_ORGANIZER_ID", DEFAULT_ORGANIZER_ID),
        "title": title.strip()[:200],
        "description": str(description) if description is not None else None,
        "category": category,
        "event_type": "In-Person",
        "location": event_location(raw),
        "tags": event_tags,
        "language": language[:50],
        "event_website": str(website)[:500] if website else None,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "capacity": 0,
        "price": max(0, price),
        "currency": str(pick(raw, "currency", "price_currency") or "EUR")[:3].upper(),
        "status": "published",
        "source": SOURCE,
        "external_id": str(external_id)[:255],
        "image_url": first_media_url(raw),
    }


class AgendaBrusselsSync:
    def __init__(self, args: argparse.Namespace):
        self.args = args
        self.api_base = os.environ.get("AGENDA_BRUSSELS_API_BASE_URL", DEFAULT_API_BASE).rstrip("/")
        self.delete_url = os.environ.get("AGENDA_BRUSSELS_DELETE_URL", DEFAULT_DELETE_URL)
        self.event_service = os.environ.get("EVENT_SERVICE_URL", DEFAULT_EVENT_SERVICE_URL).rstrip("/")
        self.sync_token = os.environ.get("PROVIDER_SYNC_TOKEN")
        self.state_path = Path(args.state_file)
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
            "User-Agent": "NewFind-agenda-brussels-sync/1.0 (MetaInsights BV; metainsights.bv@gmail.com)",
        })

    def get_json(self, url: str, params: dict[str, Any] | None = None) -> Any:
        for attempt in range(4):
            response = self.session.get(url, params=params, timeout=30)
            if response.status_code == 429 or response.status_code >= 500:
                if attempt < 3:
                    retry_after = response.headers.get("Retry-After")
                    try:
                        delay = min(30, float(retry_after)) if retry_after else 2 ** attempt
                    except ValueError:
                        delay = 2 ** attempt
                    logger.warning("Provider returned HTTP %s; retrying in %ss", response.status_code, delay)
                    time.sleep(delay)
                    continue
            response.raise_for_status()
            return response.json()
        raise RuntimeError("Provider request exhausted retry attempts")

    def post_json(self, path: str, payload: dict[str, Any], *, token: str | None = None) -> dict[str, Any]:
        url = self.event_service + path
        headers = {}
        if token:
            headers["X-Provider-Sync-Token"] = token
        response = self.session.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()

    def iter_events(self, mode: str) -> Iterable[dict[str, Any]]:
        if mode == "incremental":
            url = self.api_base + "/v1/events/updates"
            payload = self.get_json(url)
            yield from collection_from(payload)
            return

        url = self.api_base + "/v1/events"
        page = self.args.page_start
        pages_seen = 0
        while pages_seen < self.args.max_pages:
            payload = self.get_json(url, {"size": self.args.page_size, "page": page})
            rows = collection_from(payload)
            # If page numbering is zero-based, retry the first page at zero
            # when page 1 appears empty while the API reports available pages.
            if pages_seen == 0 and not rows and (page_count_from(payload) or 0) > 0 and page == 1:
                page = 0
                payload = self.get_json(url, {"size": self.args.page_size, "page": page})
                rows = collection_from(payload)
            if not rows:
                break
            yield from rows
            pages_seen += 1
            page += 1
            total_pages = page_count_from(payload)
            if total_pages is not None and pages_seen >= total_pages:
                break
            if len(rows) < self.args.page_size and total_pages is None:
                break
            time.sleep(self.args.request_delay)
        if pages_seen >= self.args.max_pages:
            raise RuntimeError("Maximum page guard reached; increase --max-pages or narrow the initial sync")

    def sync_events(self, mode: str) -> tuple[int, int]:
        seen: set[str] = set()
        upserted = skipped = failed = 0
        for raw in self.iter_events(mode):
            payload = normalize_event(raw)
            if payload is None:
                skipped += 1
                continue
            key = payload["external_id"]
            if key in seen:
                continue
            seen.add(key)
            if self.args.dry_run:
                logger.info("Would upsert %s (%s)", payload["title"], key)
                upserted += 1
                continue
            try:
                self.post_json("/events/ingest", payload)
                upserted += 1
            except requests.RequestException as exc:
                failed += 1
                logger.error("Upsert failed for provider event %s: %s", key, exc)
            if self.args.request_delay:
                time.sleep(self.args.request_delay)
        if failed:
            raise RuntimeError("%d event upserts failed; incremental checkpoint was not advanced" % failed)
        return upserted, skipped

    def sync_deletions(self, since: datetime) -> tuple[int, int]:
        params = {"deleted_at_from": since.astimezone(timezone.utc).isoformat(timespec="seconds")}
        payload = self.get_json(self.delete_url, params)
        rows = collection_from(payload)
        ids = []
        for row in rows:
            external_id = pick(row, "id", "event_id", "eventId", "uuid", "identifier")
            if external_id is not None:
                ids.append(str(external_id))
        ids = list(dict.fromkeys(ids))
        if not ids:
            return 0, 0
        if not self.sync_token:
            message = "Provider returned %d deletions, but PROVIDER_SYNC_TOKEN is unset" % len(ids)
            if not self.args.dry_run:
                raise RuntimeError(message + "; refusing to advance the deletion checkpoint")
            logger.warning("%s; dry run will not apply tombstones", message)
            return 0, len(ids)
        if self.args.dry_run:
            logger.info("Would cancel %d deleted provider events", len(ids))
            return len(ids), 0
        result = self.post_json(
            "/events/provider-deletes",
            {"source": SOURCE, "external_ids": ids},
            token=self.sync_token,
        )
        return int(result.get("cancelled", 0)), int(result.get("not_found", 0))

    def load_state(self) -> dict[str, Any]:
        try:
            return json.loads(self.state_path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return {}
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError("Cannot read sync state %s: %s" % (self.state_path, exc)) from exc

    def save_state(self, value: dict[str, Any]) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.state_path.with_suffix(self.state_path.suffix + ".tmp")
        temporary.write_text(json.dumps(value, indent=2), encoding="utf-8")
        temporary.replace(self.state_path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync visit.brussels event data into NewFind.")
    parser.add_argument("--mode", choices=("full", "incremental"), default="full",
                        help="full imports all pages; incremental imports updates from the provider's last 24 hours.")
    parser.add_argument("--page-size", type=int, default=DEFAULT_PAGE_SIZE)
    parser.add_argument("--page-start", type=int, choices=(0, 1), default=1)
    parser.add_argument("--max-pages", type=int, default=1000)
    parser.add_argument("--request-delay", type=float, default=DEFAULT_REQUEST_DELAY)
    parser.add_argument("--state-file", default=os.environ.get("AGENDA_BRUSSELS_STATE_FILE", DEFAULT_STATE_FILE))
    parser.add_argument("--dry-run", action="store_true", help="fetch and normalize without writing to NewFind.")
    return parser.parse_args()


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    args = parse_args()
    if args.page_size < 1 or args.max_pages < 1 or args.request_delay < 0:
        logger.error("page-size and max-pages must be positive; request-delay cannot be negative")
        return 2

    sync = AgendaBrusselsSync(args)
    now = utc_now()
    state = sync.load_state()
    previous = parse_datetime(state.get("last_successful_sync"))
    if previous is None:
        previous = now - timedelta(days=7)
    # Overlap the provider's delete cursor so a transient failed run is replayed.
    deletion_since = previous - timedelta(days=2)

    try:
        upserted, skipped = sync.sync_events(args.mode)
        cancelled, unknown = sync.sync_deletions(deletion_since)
        if not args.dry_run:
            sync.save_state({"last_successful_sync": now.isoformat(), "mode": args.mode})
    except (requests.RequestException, ValueError, RuntimeError) as exc:
        logger.error("Agenda.brussels sync did not complete: %s", exc)
        return 1

    logger.info(
        "Sync complete: mode=%s upserted=%d skipped=%d cancelled=%d deletion_ids_not_found=%d",
        args.mode, upserted, skipped, cancelled, unknown,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
