"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocationStore, DEFAULT_CITY } from "@eventmind/store";
import type { City } from "@eventmind/store";
import { LocationPinIcon } from "./EventIcons";
import { CaretIcon } from "./organizer/ConsoleIcons";
import { LocationSelector } from "./LocationSelector";

/** Uncontrolled by default: reads and writes the global location store. Pass
 *  `value` + `onChange` to drive it from local state instead (Explore's `city`
 *  is page state seeded from the URL, and must not overwrite the navbar's city). */
export function CityPicker({ variant = "pill", label, value, onChange, outlined = false }: {
  variant?: "pill" | "icon" | "inline"; label?: string; value?: City; onChange?: (city: City) => void;
  /** Wears the 2px control outline. Explore's top bar only, where its neighbours (search, sort) are outlined. */
  outlined?: boolean;
} = {}) {
  const ready = useLocationStore(s => s._hasHydrated);
  const selected = useLocationStore(s => s.selectedCity);
  const setStoreCity = useLocationStore(s => s.setCity);
  const city = value ?? (ready ? selected : DEFAULT_CITY);
  const setCity = onChange ?? setStoreCity;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popupId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    // Handle the nested picker before the parent mobile menu.
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open]);

  return (
    <div className="group relative min-w-0" ref={ref}>
      <button ref={trigger} type="button" onClick={() => setOpen(value => !value)}
        aria-label={label || `Select city, currently ${city.name}`} aria-expanded={open} aria-controls={open ? popupId : undefined}
        className={`flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 py-2 max-w-[180px] ${outlined ? "border-2 border-[var(--brand-control-border)] bg-[var(--brand-bg)]" : ""} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-text)]`}>
        <LocationPinIcon className="w-4 h-4 shrink-0" />
        {variant !== "icon" && <span className="truncate">{label || city.name}</span>}
        {variant !== "icon" && <CaretIcon className="w-4 h-4 shrink-0" />}
      </button>
      {/* Old page's tooltip (Gautham 2026-11-17). Navbar trigger only: it opens rightward, so it
          would clip beside the other triggers. Laptop/desktop only (Gautham, 2026-11-17): `lg+` and a
          hovering pointer, so phones and tablets never see it. */}
      {variant === "inline" && !open && (
        <span role="tooltip" className="hidden lg:group-hover:block [@media(hover:none)]:hidden absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg z-50 pointer-events-none border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-text)]">
          Click here to change your location
        </span>
      )}
      {open && (
        <div id={popupId} role="region" aria-label="Choose search location"
          className="fixed inset-x-4 top-4 p-4 max-h-[calc(100dvh-32px)] overflow-y-auto overscroll-contain rounded-lg shadow-xl z-[90] border border-[var(--brand-border)] bg-[var(--brand-surface)] lg:absolute lg:inset-x-auto lg:right-0 lg:top-full lg:mt-2 lg:w-[320px] lg:max-h-[70dvh]">
          <div className="flex items-center justify-between gap-3 mb-3 lg:hidden">
            <h2 className="text-[18px] font-bold">Choose location</h2>
            <button type="button" className="min-h-11 px-3 rounded-lg border border-[var(--brand-control-border)]"
              onClick={() => { setOpen(false); trigger.current?.focus(); }}>Close</button>
          </div>
          <LocationSelector value={city} onChange={next => { setCity(next); setOpen(false); trigger.current?.focus(); }} />
        </div>
      )}
    </div>
  );
}
