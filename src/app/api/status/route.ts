import { connection } from "next/server";
import { uspsConfigured } from "@/lib/usps";

export async function GET() {
  await connection();
  return Response.json(
    { live: uspsConfigured() },
    { headers: { "cache-control": "no-store" } },
  );
}
