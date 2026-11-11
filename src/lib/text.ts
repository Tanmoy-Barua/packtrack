import type { Place } from "@/lib/types";

export function cleanUspsText(value: string): string {
  return value
    .replace(/<\s*sup\s*>\s*®\s*<\s*\/\s*sup\s*>/gi, "®")
    .replace(/<\s*sup\s*>\s*™\s*<\s*\/\s*sup\s*>/gi, "™")
    .replace(/<[^>]+>/g, "")
    .replace(/&reg;/gi, "®")
    .replace(/&trade;/gi, "™")
    .replace(/&amp;/gi, "&")
    .replace(/&#174;/g, "®")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleCity(city: string): string {
  return city
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word === "st" || word === "st.") return "St.";
      if (word === "ft" || word === "ft.") return "Ft.";
      if (word === "mt" || word === "mt.") return "Mt.";
      if (word.length <= 2) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function makePlace(
  city?: string | null,
  state?: string | null,
  zip?: string | null,
  country?: string | null,
): Place | null {
  const next: Place = {
    city: city ? titleCity(cleanUspsText(city)) : null,
    state: state ? cleanUspsText(state).toUpperCase() : null,
    zip: zip ? cleanUspsText(zip) : null,
    country: country ? cleanUspsText(country).toUpperCase() : null,
  };
  if (!next.city && !next.state && !next.zip && !next.country) return null;
  return next;
}

export function formatPlace(place: Place | null): string | null {
  if (!place) return null;
  const locality = [place.city, place.state].filter(Boolean).join(", ");
  const country =
    place.country && place.country !== "US" && place.country !== "USA" ? place.country : null;
  const head = [locality, country].filter(Boolean).join(", ");
  const line = [head, place.zip].filter(Boolean).join(" ");
  return line || null;
}

export function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = cleanUspsText(value);
  return cleaned.length > 0 ? cleaned : null;
}
