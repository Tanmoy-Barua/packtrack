import type { Shipment } from "@/lib/types";

export function uspsPageUrl(trackingNumber: string): string {
  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
}

export function handoffShipment(trackingNumber: string): Shipment {
  return {
    trackingNumber,
    status: "On USPS.com",
    summary:
      "USPS shows the live scans on their own site. That page does not need a business account.",
    category: "pre_shipment",
    mailClass: "USPS",
    services: [],
    origin: null,
    destination: null,
    expectedDelivery: null,
    events: [],
    sample: false,
    handoff: true,
    fetchedAt: new Date().toISOString(),
  };
}
