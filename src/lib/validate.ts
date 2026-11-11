const DIGITS = /^\d{20,34}$/;
const S10 = /^[A-Z]{2}\d{9}[A-Z]{2}$/;

export function normalizeTrackingNumber(input: string): string | null {
  if (typeof input !== "string") return null;
  let cleaned = input.trim().replace(/^(usps|tracking(?:\s*number)?|trk)[\s:#-]*/i, "");
  cleaned = cleaned.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (DIGITS.test(cleaned) || S10.test(cleaned)) return cleaned;
  return null;
}
