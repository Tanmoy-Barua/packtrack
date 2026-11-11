import type { StatusCategory } from "@/lib/types";

export const CATEGORY_LABEL: Record<StatusCategory, string> = {
  pre_shipment: "Label created",
  accepted: "Accepted",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  available_for_pickup: "Ready for pickup",
  delivery_attempted: "Delivery attempted",
  alert: "Needs a look",
  returned: "Returning",
};

export const PROGRESS_STEPS = [
  { id: "pre_shipment", label: "Label" },
  { id: "accepted", label: "Accepted" },
  { id: "in_transit", label: "Transit" },
  { id: "out_for_delivery", label: "Out" },
  { id: "delivered", label: "Delivered" },
] as const;

export function normalizeCategory(
  category: string | undefined,
  status: string,
): StatusCategory {
  const blob = `${category ?? ""} ${status}`.toLowerCase();

  if (
    blob.includes("return to sender") ||
    blob.includes("returned to sender") ||
    /\breturned\b/.test(blob)
  ) {
    return "returned";
  }
  if (
    blob.includes("delivery attempt") ||
    blob.includes("delivery attempted") ||
    blob.includes("notice left")
  ) {
    return "delivery_attempted";
  }
  if (blob.includes("out for delivery")) return "out_for_delivery";
  if (
    blob.includes("available for pickup") ||
    blob.includes("held at post office") ||
    blob.includes("ready for pickup")
  ) {
    return "available_for_pickup";
  }
  if (/\bdelivered\b/.test(blob)) return "delivered";
  if (
    blob.includes("alert") ||
    blob.includes("exception") ||
    blob.includes("weather") ||
    blob.includes("no access") ||
    blob.includes("forwarded") ||
    blob.includes("delayed")
  ) {
    return "alert";
  }
  if (
    blob.includes("pre-shipment") ||
    blob.includes("pre shipment") ||
    blob.includes("label created") ||
    blob.includes("shipping label") ||
    blob.includes("awaiting item") ||
    blob.includes("awaiting")
  ) {
    return "pre_shipment";
  }
  if (
    blob.includes("accepted") ||
    blob.includes("acceptance") ||
    blob.includes("possession") ||
    blob.includes("picked up") ||
    blob.includes("usps in possession")
  ) {
    return "accepted";
  }
  if (
    blob.includes("transit") ||
    blob.includes("arrived") ||
    blob.includes("departed") ||
    blob.includes("processed")
  ) {
    return "in_transit";
  }

  const normalized = (category ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  const known: Record<string, StatusCategory> = {
    pre_shipment: "pre_shipment",
    accepted: "accepted",
    in_transit: "in_transit",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    available_for_pickup: "available_for_pickup",
    delivery_attempt: "delivery_attempted",
    delivery_attempted: "delivery_attempted",
    alert: "alert",
    returned: "returned",
  };
  return known[normalized] ?? "in_transit";
}

export function stepIndex(category: StatusCategory): number {
  switch (category) {
    case "pre_shipment":
      return 0;
    case "accepted":
      return 1;
    case "in_transit":
    case "alert":
    case "returned":
      return 2;
    case "out_for_delivery":
    case "delivery_attempted":
    case "available_for_pickup":
      return 3;
    case "delivered":
      return 4;
  }
}
