import type { Place, ScanEvent } from "@/lib/types";
import { formatPlace } from "@/lib/text";

export function groupNumber(value: string): string {
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(value)) {
    return `${value.slice(0, 2)} ${value.slice(2, 11)} ${value.slice(11)}`;
  }
  return value.replace(/(.{4})/g, "$1 ").trim();
}

export function formatPlaceLine(place: Place | null, fallback: string): string {
  return formatPlace(place) ?? fallback;
}

function calendarDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

export function formatExpected(value: string, now = new Date()): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const date = calendarDate(Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3]));
    return withRelativeDay(date, now);
  }

  const withTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (withTime && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    const date = calendarDate(Number(withTime[1]), Number(withTime[2]), Number(withTime[3]));
    const hours = Number(withTime[4]);
    const minutes = withTime[5];
    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${withRelativeDay(date, now)} · ${hour12}:${minutes} ${suffix}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = withRelativeDay(parsed, now);
  const time = parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

function withRelativeDay(date: Date, now: Date): string {
  const start = calendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const target = calendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const diff = Math.round((target.getTime() - start.getTime()) / 86_400_000);
  const pretty = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  if (diff === 0) return `Today, ${pretty}`;
  if (diff === 1) return `Tomorrow, ${pretty}`;
  if (diff === -1) return `Yesterday, ${pretty}`;
  return pretty;
}

export function formatEventWhen(event: ScanEvent): string | null {
  if (!event.timestamp) return null;
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(event.timestamp);
  if (!hasZone) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(event.timestamp);
    if (!match) return event.timestamp;
    const date = calendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
    const hours = Number(match[4]);
    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    const pretty = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `${pretty} · ${hour12}:${match[5]} ${suffix}`;
  }
  const parsed = new Date(event.timestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatEventWhere(event: ScanEvent): string | null {
  return formatPlace({
    city: event.city,
    state: event.state,
    zip: event.zip,
    country: event.country,
  });
}

export function formatUpdated(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  return `Updated ${new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}
