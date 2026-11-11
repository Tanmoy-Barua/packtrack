import { connection } from "next/server";
import { getSample } from "@/lib/samples";
import { trackWithUsps, uspsConfigured, UspsError } from "@/lib/usps";
import { normalizeTrackingNumber } from "@/lib/validate";
import type { TrackCode, TrackFailure } from "@/lib/types";

const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 20;
const buckets = new Map<string, { count: number; reset: number }>();

const STATUS: Record<TrackCode, number> = {
  invalid: 400,
  not_found: 404,
  credentials: 503,
  unauthorized: 401,
  forbidden: 403,
  rate_limit: 429,
  upstream: 502,
};

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  const ip = first || request.headers.get("x-real-ip") || "local";
  return ip.slice(0, 64);
}

function allow(ip: string): boolean {
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || current.reset < now) {
    buckets.set(ip, { count: 1, reset: now + WINDOW_MS });
  } else if (current.count >= LIMIT) {
    return false;
  } else {
    current.count += 1;
  }
  if (buckets.size > 5000) {
    for (const [key, value] of buckets) {
      if (value.reset < now) buckets.delete(key);
    }
  }
  return true;
}

function fail(live: boolean, code: TrackCode, message: string) {
  const body: TrackFailure = { ok: false, live, code, message };
  return Response.json(body, {
    status: STATUS[code],
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  await connection();
  const live = uspsConfigured();

  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > 4000) {
    return fail(live, "invalid", "That request is too large.");
  }

  let text = "";
  try {
    text = await request.text();
  } catch {
    return fail(live, "invalid", "Send a tracking number as JSON.");
  }
  if (text.length > 4000) return fail(live, "invalid", "That request is too large.");

  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    return fail(live, "invalid", "Send a tracking number as JSON.");
  }
  if (!body || typeof body !== "object") {
    return fail(live, "invalid", "Send a tracking number as JSON.");
  }

  const record = body as { trackingNumber?: unknown; sample?: unknown };
  if (typeof record.trackingNumber !== "string") {
    return fail(live, "invalid", "Include a tracking number.");
  }

  const trackingNumber = normalizeTrackingNumber(record.trackingNumber);
  if (!trackingNumber) {
    return fail(
      live,
      "invalid",
      "That doesn’t look like a USPS tracking number. Use 20–34 digits, or an international number like EA123456789US.",
    );
  }

  const sampleOnly = record.sample === true;
  if (sampleOnly || !live) {
    const sample = getSample(trackingNumber);
    if (sample) {
      return Response.json(
        { ok: true, live, shipment: sample },
        { headers: { "cache-control": "no-store" } },
      );
    }
    if (sampleOnly) {
      return fail(live, "not_found", "That sample is not on the desk.");
    }
    return fail(
      live,
      "credentials",
      "Live USPS lookup isn’t connected yet. Open a sample shipment, then try this number again after the USPS credentials are added.",
    );
  }

  if (!allow(clientIp(request))) {
    return fail(live, "rate_limit", "Too many lookups from this network. Give it a few minutes.");
  }

  try {
    const shipment = await trackWithUsps(trackingNumber);
    return Response.json(
      { ok: true, live, shipment },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const wrapped =
      error instanceof UspsError
        ? error
        : new UspsError("upstream", "Something went wrong talking to USPS.");
    console.error("usps lookup failed", wrapped.code);
    return fail(live, wrapped.code, wrapped.message);
  }
}
