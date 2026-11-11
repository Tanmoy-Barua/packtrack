import type { StatusCategory } from "@/lib/types";

const KEY = "waybill.shelf.v1";
const EMPTY: ShelfItem[] = [];

export type ShelfItem = {
  trackingNumber: string;
  nickname: string;
  status: string;
  category: StatusCategory;
  sample: boolean;
  handoff?: boolean;
  savedAt: string;
};

const CATEGORIES = new Set<StatusCategory>([
  "pre_shipment",
  "accepted",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "available_for_pickup",
  "delivery_attempted",
  "alert",
  "returned",
]);

let cachedRaw: string | null = null;
let cachedItems: ShelfItem[] = EMPTY;

function isShelfItem(value: unknown): value is ShelfItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ShelfItem>;
  return (
    typeof item.trackingNumber === "string" &&
    typeof item.nickname === "string" &&
    typeof item.status === "string" &&
    typeof item.category === "string" &&
    CATEGORIES.has(item.category) &&
    typeof item.sample === "boolean" &&
    (item.handoff === undefined || typeof item.handoff === "boolean") &&
    typeof item.savedAt === "string"
  );
}

function parseShelf(raw: string | null): ShelfItem[] {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY;
    const items = parsed.filter(isShelfItem).slice(0, 24);
    return items.length > 0 ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function readShelf(): ShelfItem[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem(KEY);
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  cachedItems = parseShelf(raw);
  return cachedItems;
}

export function writeShelf(items: ShelfItem[]) {
  const next = items.slice(0, 24);
  const raw = JSON.stringify(next);
  localStorage.setItem(KEY, raw);
  cachedRaw = raw;
  cachedItems = next.length > 0 ? next : EMPTY;
  window.dispatchEvent(new Event("waybill-shelf"));
}

export function subscribeShelf(onStoreChange: () => void) {
  window.addEventListener("waybill-shelf", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("waybill-shelf", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function serverShelf(): ShelfItem[] {
  return EMPTY;
}
