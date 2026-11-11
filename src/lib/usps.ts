import { mapUspsPayload, publicUspsMessage } from "@/lib/map-usps";
import type { Shipment, TrackCode } from "@/lib/types";

const USPS_ORIGIN = "https://apis.usps.com";
const RESULT_TTL_MS = 2 * 60 * 1000;

export class UspsError extends Error {
  readonly code: TrackCode;

  constructor(code: TrackCode, message: string) {
    super(message);
    this.name = "UspsError";
    this.code = code;
  }
}

type TokenCache = { accessToken: string; expiresAt: number };
type ResultCache = { at: number; shipment: Shipment };

let tokenCache: TokenCache | null = null;
const resultCache = new Map<string, ResultCache>();

export function uspsConfigured(): boolean {
  return Boolean(process.env.USPS_CONSUMER_KEY && process.env.USPS_CONSUMER_SECRET);
}

function statusForHttp(status: number, message: string): UspsError {
  if (status === 404 || /not found|no record|status update is not yet/i.test(message)) {
    return new UspsError(
      "not_found",
      "USPS has no status for that number yet. It can take a few hours after a label is printed.",
    );
  }
  if (status === 400) {
    return new UspsError("invalid", message || "USPS did not accept that tracking number.");
  }
  if (status === 401) {
    return new UspsError("unauthorized", "USPS refused these credentials.");
  }
  if (status === 403) {
    return new UspsError(
      "forbidden",
      message ||
        "USPS refused this tracking number for these credentials. Access is often limited to packages on your own Mailer ID.",
    );
  }
  if (status === 429) {
    return new UspsError("rate_limit", "USPS is limiting lookups right now. Wait a few minutes and try again.");
  }
  return new UspsError("upstream", "USPS could not return tracking right now.");
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.USPS_CONSUMER_KEY;
  const clientSecret = process.env.USPS_CONSUMER_SECRET;
  if (!clientId || !clientSecret) {
    throw new UspsError("credentials", "USPS credentials are not configured.");
  }

  let response: Response;
  try {
    response = await fetch(`${USPS_ORIGIN}/oauth2/v3/token`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        scope: "tracking",
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
  } catch (error) {
    throw networkError(error);
  }

  if (response.status >= 300 && response.status < 400) {
    throw new UspsError("upstream", "USPS authentication did not complete.");
  }

  const payload = await readJson(response);
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const accessToken = typeof record?.access_token === "string" ? record.access_token : "";
  if (!response.ok || !accessToken) {
    throw new UspsError(
      response.status === 401 ? "unauthorized" : "upstream",
      "USPS did not accept these credentials.",
    );
  }

  const expiresIn = Number(record?.expires_in);
  tokenCache = {
    accessToken,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000,
  };
  return accessToken;
}

function networkError(error: unknown): UspsError {
  if (error instanceof UspsError) return error;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new UspsError("upstream", "USPS took too long to answer. Try again in a moment.");
  }
  return new UspsError("upstream", "Waybill couldn’t reach USPS just now.");
}

export async function trackWithUsps(trackingNumber: string): Promise<Shipment> {
  const cached = resultCache.get(trackingNumber);
  if (cached && Date.now() - cached.at < RESULT_TTL_MS) {
    return { ...cached.shipment, fetchedAt: cached.shipment.fetchedAt };
  }

  const token = await getToken();
  let response: Response;
  try {
    response = await fetch(
      `${USPS_ORIGIN}/tracking/v3/tracking/${encodeURIComponent(trackingNumber)}?expand=DETAIL`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/json",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      },
    );
  } catch (error) {
    throw networkError(error);
  }

  if (response.status === 401) {
    tokenCache = null;
    throw new UspsError("unauthorized", "USPS rejected the access token. Check the consumer key and secret.");
  }
  if (response.status >= 300 && response.status < 400) {
    throw new UspsError("upstream", "USPS returned an unexpected redirect.");
  }

  const payload = await readJson(response);
  if (!response.ok) {
    throw statusForHttp(response.status, publicUspsMessage(payload));
  }

  const shipment = mapUspsPayload(trackingNumber, payload);
  resultCache.set(trackingNumber, { at: Date.now(), shipment });
  if (resultCache.size > 400) {
    const oldest = resultCache.keys().next().value;
    if (oldest) resultCache.delete(oldest);
  }
  return shipment;
}
