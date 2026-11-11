"use client";

import { useCallback, useEffect, useSyncExternalStore, useState } from "react";
import { DeskRail } from "@/components/desk-rail";
import { ShipmentStage } from "@/components/shipment-stage";
import { groupNumber } from "@/lib/format";
import { listSamples, sampleTitle } from "@/lib/samples";
import { readShelf, serverShelf, subscribeShelf, writeShelf, type ShelfItem } from "@/lib/shelf";
import type { Shipment, TrackCode, TrackResult } from "@/lib/types";
import { normalizeTrackingNumber } from "@/lib/validate";

const samples = listSamples();

function upsert(prev: ShelfItem[], shipment: Shipment): ShelfItem[] {
  const existing = prev.find((item) => item.trackingNumber === shipment.trackingNumber);
  const next: ShelfItem = {
    trackingNumber: shipment.trackingNumber,
    nickname: existing?.nickname || sampleTitle(shipment.trackingNumber) || "",
    status: shipment.status,
    category: shipment.category,
    sample: shipment.sample,
    savedAt: existing?.savedAt ?? new Date().toISOString(),
  };
  return [next, ...prev.filter((item) => item.trackingNumber !== next.trackingNumber)].slice(0, 24);
}

export function TrackerApp() {
  const shelf = useSyncExternalStore(subscribeShelf, readShelf, serverShelf);
  const [query, setQuery] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState<boolean | null>(null);
  const [error, setError] = useState<{ code: TrackCode; message: string } | null>(null);

  const lookup = useCallback(async (raw: string, opts?: { sample?: boolean; keep?: boolean }) => {
    const trackingNumber = normalizeTrackingNumber(raw);
    if (!trackingNumber) {
      setError({
        code: "invalid",
        message:
          "That doesn’t look like a USPS tracking number. Use 20–34 digits, or an international number like EA123456789US.",
      });
      if (!opts?.keep) setShipment(null);
      setLoading(false);
      return;
    }

    setQuery(groupNumber(trackingNumber));
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trackingNumber, sample: Boolean(opts?.sample) }),
      });
      const data = (await response.json()) as TrackResult;
      if (typeof data.live === "boolean") setLive(data.live);
      if (!data.ok) {
        setError({ code: data.code, message: data.message });
        if (!opts?.keep) setShipment(null);
        return;
      }
      setShipment(data.shipment);
      writeShelf(upsert(readShelf(), data.shipment));
      const url = new URL(window.location.href);
      url.searchParams.set("n", data.shipment.trackingNumber);
      if (data.shipment.sample) url.searchParams.set("sample", "1");
      else url.searchParams.delete("sample");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    } catch {
      setError({
        code: "upstream",
        message: "The desk couldn’t reach the server. Check the connection and try again.",
      });
      if (!opts?.keep) setShipment(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/status", { signal: controller.signal })
      .then((response) => response.json() as Promise<{ live?: boolean }>)
      .then((data) => setLive(Boolean(data.live)))
      .catch(() => undefined);

    const params = new URLSearchParams(window.location.search);
    const number = params.get("n");
    const sample = params.get("sample") === "1";
    const handle = window.setTimeout(() => {
      if (number) void lookup(number, { sample });
    }, 0);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [lookup]);

  function remove(trackingNumber: string) {
    writeShelf(readShelf().filter((item) => item.trackingNumber !== trackingNumber));
    if (shipment?.trackingNumber === trackingNumber) {
      setShipment(null);
      setError(null);
      setQuery("");
      window.history.replaceState(null, "", "/");
    }
  }

  const nickname =
    shelf.find((item) => item.trackingNumber === shipment?.trackingNumber)?.nickname ?? "";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[22.5rem_minmax(0,1fr)]">
      <DeskRail
        query={query}
        onQuery={setQuery}
        onSubmit={() => void lookup(query)}
        loading={loading}
        live={live}
        shelf={shelf}
        activeNumber={shipment?.trackingNumber ?? null}
        errorCode={error?.code ?? null}
        samples={samples}
        shipmentOpen={Boolean(shipment)}
        onOpen={(trackingNumber, sample) => void lookup(trackingNumber, { sample })}
        onRemove={remove}
      />
      <ShipmentStage
        shipment={shipment}
        loading={loading}
        error={error}
        nickname={nickname}
        onNickname={(value) => {
          if (!shipment) return;
          writeShelf(
            readShelf().map((item) =>
              item.trackingNumber === shipment.trackingNumber
                ? { ...item, nickname: value.slice(0, 60) }
                : item,
            ),
          );
        }}
        onRefresh={() => {
          if (!shipment) return;
          void lookup(shipment.trackingNumber, { sample: shipment.sample, keep: true });
        }}
        onRemove={() => {
          if (shipment) remove(shipment.trackingNumber);
        }}
        onSample={(trackingNumber) => void lookup(trackingNumber, { sample: true })}
      />
    </div>
  );
}
