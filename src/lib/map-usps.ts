import { normalizeCategory } from "@/lib/status";
import { asString, makePlace, titleCity } from "@/lib/text";
import type { ScanEvent, Shipment } from "@/lib/types";

function stringList(value: unknown): string[] {
  if (typeof value === "string") {
    const cleaned = asString(value);
    return cleaned ? [cleaned] : [];
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? asString(item) : null))
    .filter((item): item is string => Boolean(item));
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function expectedDelivery(data: Record<string, unknown>): string | null {
  const date = asString(data.expectedDeliveryDate) ?? asString(data.guaranteedDeliveryDate);
  if (!date) return null;
  const time = asString(data.expectedDeliveryTime);
  if (time && /^\d{2}:\d{2}/.test(time) && !date.includes("T")) return `${date}T${time}`;
  return date;
}

function mapEvent(value: unknown): ScanEvent | null {
  const record = readRecord(value);
  if (!record) return null;
  const type = asString(record.eventType) ?? asString(record.eventDescription);
  if (!type) return null;
  const city = asString(record.eventCity);
  const state = asString(record.eventState);
  const country = asString(record.eventCountry);
  return {
    type,
    timestamp: asString(record.eventTimestamp),
    city: city ? titleCity(city) : null,
    state: state ? state.toUpperCase() : null,
    zip: asString(record.eventZIP) ?? asString(record.eventZip),
    country: country ? country.toUpperCase() : null,
  };
}

function sortEvents(events: ScanEvent[]): ScanEvent[] {
  return [...events].sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0;
  });
}

export function mapUspsPayload(trackingNumber: string, payload: unknown): Shipment {
  const data = readRecord(payload) ?? {};
  const legacy = readRecord(data.TrackResults);
  const legacyInfo = legacy ? readRecord(legacy.TrackInfo) : null;
  const summaryFromLegacy = legacyInfo ? asString(legacyInfo.TrackSummary) : null;

  const status =
    asString(data.status) ??
    summaryFromLegacy ??
    "Status update pending";
  const summary = asString(data.statusSummary) ?? summaryFromLegacy ?? status;
  const category = normalizeCategory(asString(data.statusCategory) ?? undefined, status);
  const events = sortEvents(
    (Array.isArray(data.trackingEvents) ? data.trackingEvents : [])
      .map(mapEvent)
      .filter((event): event is ScanEvent => Boolean(event)),
  );

  if (events.length === 0) {
    events.push({
      type: status,
      timestamp: null,
      city: asString(data.originCity),
      state: asString(data.originState),
      zip: asString(data.originZIP),
      country: null,
    });
  }

  return {
    trackingNumber: asString(data.trackingNumber) ?? trackingNumber,
    status,
    summary,
    category,
    mailClass: asString(data.mailClass),
    services: stringList(data.services),
    origin: makePlace(
      asString(data.originCity),
      asString(data.originState),
      asString(data.originZIP),
      null,
    ),
    destination: makePlace(
      asString(data.destinationCity),
      asString(data.destinationState),
      asString(data.destinationZIP),
      null,
    ),
    expectedDelivery: expectedDelivery(data),
    events,
    sample: false,
    handoff: false,
    fetchedAt: new Date().toISOString(),
  };
}

export function publicUspsMessage(payload: unknown): string {
  const data = readRecord(payload);
  if (!data) return "";
  const error = readRecord(data.error);
  const nested = Array.isArray(error?.errors) ? readRecord(error.errors[0]) : null;
  const text =
    asString(error?.message) ??
    asString(nested?.detail) ??
    asString(nested?.title) ??
    asString(data.message) ??
    "";
  if (!text || text.length > 180 || /bearer|token|secret|client_secret/i.test(text)) return "";
  return text;
}
