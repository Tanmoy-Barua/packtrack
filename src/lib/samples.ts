import type { ScanEvent, Shipment } from "@/lib/types";

export const SAMPLE_NUMBERS = {
  transit: "9405500100000000000017",
  truck: "9405500100000000000024",
  delivered: "9405500100000000000031",
  delay: "9405500100000000000048",
  border: "EH000000005US",
} as const;

export type SampleCard = {
  trackingNumber: string;
  title: string;
  blurb: string;
  route: string;
};

const HOUR = 3_600_000;

function ago(hours: number): string {
  return new Date(Date.now() - hours * HOUR).toISOString();
}

function dateFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function scan(
  hours: number,
  type: string,
  city: string,
  state: string,
  zip: string,
  country = "US",
): ScanEvent {
  return {
    type,
    timestamp: ago(hours),
    city,
    state,
    zip,
    country,
  };
}

function shipment(
  partial: Omit<Shipment, "sample" | "handoff" | "fetchedAt" | "events"> & { events: ScanEvent[] },
): Shipment {
  return {
    ...partial,
    events: [...partial.events].sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return a.timestamp < b.timestamp ? 1 : -1;
    }),
    sample: true,
    handoff: false,
    fetchedAt: new Date().toISOString(),
  };
}

type Story = SampleCard & { build: () => Shipment };

const STORIES: Story[] = [
  {
    trackingNumber: SAMPLE_NUMBERS.transit,
    title: "Linen lamp",
    blurb: "Priority Mail, crossing the country.",
    route: "Oakland → Brooklyn",
    build: () =>
      shipment({
        trackingNumber: SAMPLE_NUMBERS.transit,
        status: "In transit to next facility",
        summary: "The lamp left a USPS regional facility in Denver overnight and is headed east.",
        category: "in_transit",
        mailClass: "Priority Mail®",
        services: ["USPS Tracking®", "Insurance included"],
        origin: { city: "Oakland", state: "CA", zip: "94607", country: "US" },
        destination: { city: "Brooklyn", state: "NY", zip: "11215", country: "US" },
        expectedDelivery: dateFromNow(2),
        events: [
          scan(30, "Shipping label created", "Oakland", "CA", "94607"),
          scan(26, "Accepted at USPS origin facility", "Oakland", "CA", "94607"),
          scan(22, "Arrived at USPS regional facility", "Oakland", "CA", "94615"),
          scan(18, "Departed USPS regional facility", "Oakland", "CA", "94615"),
          scan(9, "Arrived at USPS regional facility", "Denver", "CO", "80249"),
          scan(6, "Departed USPS regional facility", "Denver", "CO", "80249"),
        ],
      }),
  },
  {
    trackingNumber: SAMPLE_NUMBERS.truck,
    title: "Film scans",
    blurb: "Out for delivery on the morning route.",
    route: "Austin → East Austin",
    build: () =>
      shipment({
        trackingNumber: SAMPLE_NUMBERS.truck,
        status: "Out for delivery",
        summary: "The carrier has the sleeve and is on the East Austin route this morning.",
        category: "out_for_delivery",
        mailClass: "Priority Mail Express®",
        services: ["USPS Tracking®", "Signature waived"],
        origin: { city: "Austin", state: "TX", zip: "78704", country: "US" },
        destination: { city: "Austin", state: "TX", zip: "78702", country: "US" },
        expectedDelivery: dateFromNow(0),
        events: [
          scan(50, "Shipping label created", "Austin", "TX", "78704"),
          scan(46, "Accepted at USPS origin facility", "Austin", "TX", "78704"),
          scan(20, "Arrived at USPS facility", "Austin", "TX", "78702"),
          scan(3, "Out for delivery", "Austin", "TX", "78702"),
        ],
      }),
  },
  {
    trackingNumber: SAMPLE_NUMBERS.delivered,
    title: "Wool coat",
    blurb: "Left on the front porch yesterday.",
    route: "Portland → Seattle",
    build: () =>
      shipment({
        trackingNumber: SAMPLE_NUMBERS.delivered,
        status: "Delivered, front porch",
        summary: "Left by the front door in Seattle. A neighbor wasn’t required.",
        category: "delivered",
        mailClass: "Priority Mail®",
        services: ["USPS Tracking®"],
        origin: { city: "Portland", state: "OR", zip: "97214", country: "US" },
        destination: { city: "Seattle", state: "WA", zip: "98122", country: "US" },
        expectedDelivery: null,
        events: [
          scan(70, "Shipping label created", "Portland", "OR", "97214"),
          scan(64, "Accepted at USPS origin facility", "Portland", "OR", "97214"),
          scan(40, "Arrived at USPS regional facility", "Seattle", "WA", "98168"),
          scan(28, "Out for delivery", "Seattle", "WA", "98122"),
          scan(26, "Delivered, front porch", "Seattle", "WA", "98122"),
        ],
      }),
  },
  {
    trackingNumber: SAMPLE_NUMBERS.delay,
    title: "Record crate",
    blurb: "Held overnight for weather north of Chicago.",
    route: "Chicago → Minneapolis",
    build: () =>
      shipment({
        trackingNumber: SAMPLE_NUMBERS.delay,
        status: "Delivery exception, weather delay",
        summary: "A winter storm is holding the crate at the Chicago network hub. It moves when the roads open.",
        category: "alert",
        mailClass: "Parcel Select®",
        services: ["USPS Tracking®"],
        origin: { city: "Chicago", state: "IL", zip: "60622", country: "US" },
        destination: { city: "Minneapolis", state: "MN", zip: "55408", country: "US" },
        expectedDelivery: dateFromNow(3),
        events: [
          scan(40, "Accepted at USPS origin facility", "Chicago", "IL", "60622"),
          scan(28, "Departed USPS regional facility", "Chicago", "IL", "60622"),
          scan(12, "Arrived at USPS regional facility", "Chicago", "IL", "60607"),
          scan(8, "Delivery exception, weather delay", "Chicago", "IL", "60607"),
        ],
      }),
  },
  {
    trackingNumber: SAMPLE_NUMBERS.border,
    title: "Tea tins",
    blurb: "Cleared the international service center.",
    route: "London → Chicago",
    build: () =>
      shipment({
        trackingNumber: SAMPLE_NUMBERS.border,
        status: "Processed through USPS facility",
        summary: "The tins cleared the international service center in New York and are on a domestic truck.",
        category: "in_transit",
        mailClass: "First-Class Package International®",
        services: ["USPS Tracking®"],
        origin: { city: "London", state: null, zip: null, country: "GB" },
        destination: { city: "Chicago", state: "IL", zip: "60614", country: "US" },
        expectedDelivery: dateFromNow(4),
        events: [
          {
            type: "Acceptance",
            timestamp: ago(90),
            city: "London",
            state: null,
            zip: null,
            country: "GB",
          },
          scan(36, "Processed through USPS facility", "New York", "NY", "11430"),
          scan(20, "Departed USPS regional facility", "New York", "NY", "11430"),
          scan(7, "In transit to next facility", "Pittsburgh", "PA", "15250"),
        ],
      }),
  },
];

const BY_NUMBER = new Map(STORIES.map((story) => [story.trackingNumber, story]));

export function listSamples(): SampleCard[] {
  return STORIES.map(({ trackingNumber, title, blurb, route }) => ({
    trackingNumber,
    title,
    blurb,
    route,
  }));
}

export function sampleTitle(trackingNumber: string): string | null {
  return BY_NUMBER.get(trackingNumber)?.title ?? null;
}

export function getSample(trackingNumber: string): Shipment | null {
  const story = BY_NUMBER.get(trackingNumber);
  return story ? story.build() : null;
}
