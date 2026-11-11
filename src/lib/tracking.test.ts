import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapUspsPayload, publicUspsMessage } from "./map-usps";
import { getSample, SAMPLE_NUMBERS } from "./samples";
import { normalizeCategory } from "./status";
import { cleanUspsText, formatPlace } from "./text";
import { normalizeTrackingNumber } from "./validate";

describe("normalizeTrackingNumber", () => {
  it("accepts a grouped 22-digit USPS number", () => {
    assert.equal(normalizeTrackingNumber("9400 1118 9922-3197 4284 90"), "9400111899223197428490");
  });

  it("accepts an international S10 code", () => {
    assert.equal(normalizeTrackingNumber("ea123456789us"), "EA123456789US");
  });

  it("strips a pasted USPS label", () => {
    assert.equal(normalizeTrackingNumber("USPS: 9400111899223197428490"), "9400111899223197428490");
  });

  it("rejects links, short codes, and empty input", () => {
    assert.equal(normalizeTrackingNumber("https://tools.usps.com/go/TrackConfirmAction?tLabels=9400"), null);
    assert.equal(normalizeTrackingNumber("12345"), null);
    assert.equal(normalizeTrackingNumber(""), null);
    assert.equal(normalizeTrackingNumber("<script>alert(1)</script>"), null);
  });
});

describe("status and text", () => {
  it("buckets USPS phrases", () => {
    assert.equal(normalizeCategory("In Transit", "Arrived at USPS facility"), "in_transit");
    assert.equal(normalizeCategory(undefined, "Delivered, Front Door/Porch"), "delivered");
    assert.equal(normalizeCategory("Alert", "Delivery exception, weather delay"), "alert");
    assert.equal(normalizeCategory(undefined, "Shipping Label Created, USPS Awaiting Item"), "pre_shipment");
    assert.equal(normalizeCategory("Accepted", "USPS in possession of item"), "accepted");
  });

  it("strips USPS markup and formats places", () => {
    assert.equal(cleanUspsText("Priority Mail<SUP>®</SUP>"), "Priority Mail®");
    assert.equal(
      formatPlace({ city: "Cedar Rapids", state: "IA", zip: "52404", country: "US" }),
      "Cedar Rapids, IA 52404",
    );
    assert.equal(formatPlace({ city: "London", state: null, zip: null, country: "GB" }), "London, GB");
  });
});

describe("USPS payload mapping", () => {
  it("maps a detail response into a shipment", () => {
    const shipment = mapUspsPayload("9400111899223197428490", {
      destinationCity: "CEDAR RAPIDS",
      destinationState: "IA",
      destinationZIP: "52404",
      mailClass: "Priority Mail<SUP>®</SUP>",
      originCity: "RICHMOND",
      originState: "VA",
      originZIP: "23227",
      services: ["USPS Tracking<SUP>®</SUP>"],
      status: "USPS in possession of item",
      statusCategory: "Accepted",
      statusSummary: "USPS is now in possession of your item.",
      expectedDeliveryDate: "2026-11-12",
      trackingNumber: "9400111899223197428490",
      trackingEvents: [
        {
          eventType: "USPS in possession of item",
          eventTimestamp: "2026-11-10T07:31:00Z",
          eventCity: "RICHMOND",
          eventState: "VA",
          eventZIP: "23227",
          eventCountry: null,
        },
      ],
    });

    assert.equal(shipment.category, "accepted");
    assert.equal(shipment.mailClass, "Priority Mail®");
    assert.equal(shipment.origin?.city, "Richmond");
    assert.equal(shipment.events[0]?.city, "Richmond");
    assert.equal(shipment.expectedDelivery, "2026-11-12");
    assert.equal(shipment.sample, false);
  });

  it("hides upstream messages that look like credentials", () => {
    assert.equal(publicUspsMessage({ error: { message: "Bearer secret-token" } }), "");
    assert.equal(publicUspsMessage({ error: { message: "Tracking number not found" } }), "Tracking number not found");
  });
});

describe("samples", () => {
  it("builds every reserved sample with a timeline", () => {
    for (const trackingNumber of Object.values(SAMPLE_NUMBERS)) {
      const shipment = getSample(trackingNumber);
      assert.ok(shipment);
      assert.equal(shipment.sample, true);
      assert.equal(shipment.trackingNumber, trackingNumber);
      assert.ok(shipment.events.length >= 3);
      assert.equal(normalizeTrackingNumber(trackingNumber), trackingNumber);
    }
    assert.equal(getSample("9400111899223197428490"), null);
  });
});
