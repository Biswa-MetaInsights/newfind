"""Read public OpenAgenda calendars and normalize licensed event listings.

Only public oa_pk_ keys are accepted. Provider images are deliberately omitted
until image credits can be displayed consistently on every card and detail view.
"""
import json
import math
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

BASE = 'https://api.openagenda.com/v2'
ORGANIZER_ID = '00000000-0000-0000-0000-000000000097'
DEFAULT_AGENDAS = [89904399, 65924599, 77951488]


class ProviderError(RuntimeError):
    def __init__(self, status):
        self.status = status
        super().__init__(f'OpenAgenda returned HTTP {status}; no credentials logged')


class Client:
    def __init__(self, key, *, pause=time.sleep):
        if not key.startswith('oa_pk_'):
            raise ValueError('A public read-only OpenAgenda key is required')
        self.key, self.pause = key, pause

    def get(self, path, params=None):
        url = BASE + path + ('?' + urlencode(params, doseq=True) if params else '')
        self.pause(.3)
        try:
            with urlopen(Request(url, headers={'key': self.key, 'Accept': 'application/json'}), timeout=30) as response:
                return json.load(response)
        except HTTPError as error:
            raise ProviderError(error.code) from None
        except (URLError, TimeoutError, ValueError):
            raise ProviderError(503) from None

    def events(self, agenda, pages=5):
        if not str(agenda).isdigit() or not 1 <= pages <= 10:
            raise ValueError('Invalid agenda or page bound')
        after = None
        for _ in range(pages):
            params = {'relative[]': ['current', 'upcoming'], 'state': 2,
                      'detailed': 1, 'size': 100, 'sort': 'timings.asc'}
            if after is not None:
                params['after[]'] = after
            data = self.get(f'/agendas/{agenda}/events', params)
            if not isinstance(data.get('events'), list):
                raise ProviderError(502)
            yield from data['events']
            cursor = data.get('after')
            if not cursor or cursor == after:
                break
            after = cursor

    def event(self, agenda, uid):
        if not str(agenda).isdigit() or not str(uid).isdigit():
            raise ValueError('Invalid provider identifiers')
        data = self.get(f'/agendas/{agenda}/events/{uid}', {'detailed': 1})
        return data.get('event', data)


def text(value, preferred='en'):
    if isinstance(value, str):
        return value.strip()
    if not isinstance(value, dict):
        return ''
    return next((value[lang].strip() for lang in [preferred, 'fr', 'nl', 'de', *value]
                 if isinstance(value.get(lang), str) and value[lang].strip()), '')


def instant(value):
    try:
        date = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return date.astimezone(timezone.utc) if date.tzinfo else None
    except (AttributeError, TypeError, ValueError):
        return None


def normalize_event(event, agenda, *, now=None):
    """One stable listing per provider UID; show its next remaining time slot."""
    now = now or datetime.now(timezone.utc)
    if (event.get('removed') or event.get('private') or event.get('state') != 2
            or event.get('attendanceMode', 1) == 2 or event.get('status') == 3):
        return None
    rights = event.get('rights') or {}
    licence = rights.get('license') or {}
    licensor = rights.get('licensor') or {}
    # Other licences need individual review before commercial redistribution.
    if licence.get('id') != 'etalab-2.0' or not licensor.get('name'):
        return None
    updated = instant(event.get('updatedAt'))
    uid = event.get('uid')
    title = text(event.get('title'))
    if not str(uid).isdigit() or len(title) < 5 or updated is None:
        return None
    slots = []
    for slot in event.get('timings') or []:
        begin, end = instant(slot.get('begin')), instant(slot.get('end'))
        if begin and end and end > begin and end > now:
            slots.append((begin, end))
    if not slots:
        return None
    start, end = min(slots)
    loc = event.get('location') or {}
    try:
        lat, lng = float(loc['latitude']), float(loc['longitude'])
        if not math.isfinite(lat + lng) or not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return None
    except (KeyError, TypeError, ValueError):
        return None
    zone = event.get('timezone') or loc.get('timezone') or 'UTC'
    try:
        ZoneInfo(zone)
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        return None
    origin = event.get('originAgenda') or {}
    slug = origin.get('slug') or str(agenda)
    event_slug = event.get('slug') or str(uid)
    url = f'https://openagenda.com/{quote(str(slug), safe="")}/events/{uid}_{quote(str(event_slug), safe="")}'
    description = text(event.get('longDescription')) or text(event.get('description'))
    conditions = text(event.get('conditions'))
    attribution = (f'Source: {licensor["name"]} via OpenAgenda. Licence Ouverte 2.0 '
                   f'(https://www.data.gouv.fr/pages/legal/licences/etalab-2.0/). '
                   f'Source updated: {updated.isoformat()}.')
    description = '\n\n'.join(part for part in [description, f'Admission: {conditions}' if conditions else '', attribution] if part)
    keywords = event.get('keywords') or {}
    words = (keywords.get('en') or keywords.get('fr') or []) if isinstance(keywords, dict) else []
    if not isinstance(words, list):
        words = []
    titles = event.get('title')
    language = next((lang for lang in ['en', 'fr', 'nl', 'de', *titles]
                     if isinstance(titles.get(lang), str) and titles[lang].strip()), 'fr') if isinstance(titles, dict) else 'fr'
    tags = list(dict.fromkeys(str(word)[:80] for word in words))[:29] + ['OpenAgenda']
    status = {4: 'cancelled', 5: 'registration_closed', 6: 'cancelled'}.get(event.get('status'), 'published')
    return {'organizer_id': ORGANIZER_ID, 'source': 'openagenda', 'external_id': str(uid),
            'title': title[:200], 'description': description[:20000], 'category': 'General',
            'event_type': 'Hybrid' if event.get('attendanceMode') == 3 else 'In-Person', 'start_date': start.replace(tzinfo=None),
            'end_date': end.replace(tzinfo=None), 'timezone': zone, 'tags': tags,
            'location': {k: v for k, v in {'name': loc.get('name'), 'city': loc.get('city'),
                         'country': loc.get('countryCode'), 'address': loc.get('address'),
                         'latitude': lat, 'longitude': lng}.items() if v is not None},
            'event_website': url, 'capacity': 0, 'price': 0, 'currency': 'EUR',
            'status': status, 'visibility': 'public', 'image_url': None,
            'organizer_content': {'organization_name': str(licensor['name'])[:120]},
            'language': language,
            'content_generated': {'openagenda': {'agenda_uid': int(agenda), 'rights': rights,
                'updated_at': event.get('updatedAt'), 'conditions': conditions,
                'image_credits': event.get('imageCredits'), 'occurrences': len(slots)}}}
