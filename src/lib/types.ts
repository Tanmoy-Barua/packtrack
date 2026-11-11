export type StatusCategory =
  | "pre_shipment"
  | "accepted"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "available_for_pickup"
  | "delivery_attempted"
  | "alert"
  | "returned";

export type Place = {
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
};

export type ScanEvent = {
  type: string;
  timestamp: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
};

export type Shipment = {
  trackingNumber: string;
  status: string;
  summary: string;
  category: StatusCategory;
  mailClass: string | null;
  services: string[];
  origin: Place | null;
  destination: Place | null;
  expectedDelivery: string | null;
  events: ScanEvent[];
  sample: boolean;
  handoff: boolean;
  fetchedAt: string;
};

export type TrackCode =
  | "invalid"
  | "not_found"
  | "credentials"
  | "unauthorized"
  | "forbidden"
  | "rate_limit"
  | "upstream";

export type TrackSuccess = {
  ok: true;
  live: boolean;
  shipment: Shipment;
};

export type TrackFailure = {
  ok: false;
  live: boolean;
  code: TrackCode;
  message: string;
};

export type TrackResult = TrackSuccess | TrackFailure;
