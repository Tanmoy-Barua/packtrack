import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEventWhen, formatEventWhere, formatExpected, formatUpdated, groupNumber } from "@/lib/format";
import { uspsPageUrl } from "@/lib/handoff";
import { listSamples, type SampleCard } from "@/lib/samples";
import { CATEGORY_LABEL, PROGRESS_STEPS, stepIndex } from "@/lib/status";
import { formatPlace } from "@/lib/text";
import type { Shipment, StatusCategory, TrackCode } from "@/lib/types";
import { cn } from "cn";

const ERROR_TITLE: Record<TrackCode, string> = {
  invalid: "Check the number",
  not_found: "No scan on file",
  credentials: "Live lookup isn’t connected",
  unauthorized: "USPS refused the key",
  forbidden: "USPS kept this number private",
  rate_limit: "Too many lookups",
  upstream: "USPS didn’t answer",
};

const ATTENTION: Partial<Record<StatusCategory, string>> = {
  alert: "Something interrupted the trip.",
  returned: "This parcel is heading back.",
  delivery_attempted: "The carrier tried and couldn’t leave it.",
  available_for_pickup: "It’s waiting to be picked up.",
};

type ShipmentStageProps = {
  shipment: Shipment | null;
  loading: boolean;
  error: { code: TrackCode; message: string } | null;
  nickname: string;
  onNickname: (value: string) => void;
  onRefresh: () => void;
  onRemove: () => void;
  onSample: (trackingNumber: string) => void;
};

export function ShipmentStage(props: ShipmentStageProps) {
  const { shipment, loading, error } = props;

  return (
    <main className="grain relative min-w-0 px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
      {loading && !shipment ? <LoadingState /> : null}
      {!loading && !shipment && !error ? <EmptyState onSample={props.onSample} /> : null}
      {error && !shipment ? (
        <ErrorState error={error} onSample={props.onSample} />
      ) : null}
      {shipment ? <ShipmentDetail {...props} shipment={shipment} /> : null}
    </main>
  );
}

function EmptyState({ onSample }: { onSample: (trackingNumber: string) => void }) {
  const featured = listSamples().slice(0, 3);
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm leading-6 text-ink-soft lg:hidden">
        Choose a sample shipment above, or track a number. The label opens on this blotter.
      </p>
      <p className="hidden text-[11px] uppercase tracking-[0.22em] text-ink-soft lg:block">The blotter is clear</p>
      <h2 className="mt-3 hidden max-w-xl font-display text-[clamp(2.6rem,6vw,4.6rem)] leading-[0.95] tracking-tight lg:block">
        Where is it now?
      </h2>
      <p className="mt-4 hidden max-w-lg text-base leading-7 text-ink-soft lg:block">
        Open a sample to see a full scan history, or paste a real USPS number in the desk. Waybill asks
        USPS for the latest event and leaves the parcel here under a name you choose.
      </p>
      <div className="mt-10 hidden gap-4 lg:grid lg:grid-cols-3">
        {featured.map((sample, index) => (
          <SampleTicket
            key={sample.trackingNumber}
            sample={sample}
            className={cn(index === 0 && "lg:-rotate-2", index === 2 && "lg:mt-6 lg:rotate-2")}
            onSample={onSample}
          />
        ))}
      </div>
    </div>
  );
}

function SampleTicket({
  sample,
  className,
  onSample,
}: {
  sample: SampleCard;
  className?: string;
  onSample: (trackingNumber: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSample(sample.trackingNumber)}
      className={cn(
        "ticket rounded-[1.4rem] px-6 py-6 text-left transition duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy",
        className,
      )}
    >
      <span className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">Sample shipment</span>
      <span className="mt-3 block font-display text-3xl leading-none tracking-tight">{sample.title}</span>
      <span className="mt-3 block text-sm text-ink-soft">{sample.route}</span>
      <span className="mt-4 block text-sm leading-6">{sample.blurb}</span>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-3xl" aria-live="polite">
      <p className="text-[11px] uppercase tracking-[0.22em] text-ink-soft">Asking USPS</p>
      <h2 className="mt-3 font-display text-4xl tracking-tight">Reading the label.</h2>
      <div className="scan-bar ticket mt-8 h-56 rounded-[1.4rem]" />
    </div>
  );
}

function ErrorState({
  error,
  onSample,
}: {
  error: { code: TrackCode; message: string };
  onSample: (trackingNumber: string) => void;
}) {
  const sample = listSamples()[0];
  return (
    <div className="mx-auto max-w-xl" role="alert">
      <p className="text-[11px] uppercase tracking-[0.22em] text-seal">Couldn’t track</p>
      <h2 className="mt-3 font-display text-5xl leading-none tracking-tight">{ERROR_TITLE[error.code]}</h2>
      <p className="mt-4 text-base leading-7 text-ink-soft">{error.message}</p>
      {sample ? (
        <Button
          type="button"
          className="mt-6 h-11 rounded-full px-5"
          onClick={() => onSample(sample.trackingNumber)}
        >
          Open the linen lamp sample
        </Button>
      ) : null}
    </div>
  );
}

function ShipmentDetail({
  shipment,
  loading,
  error,
  nickname,
  onNickname,
  onRefresh,
  onRemove,
}: ShipmentStageProps & { shipment: Shipment }) {
  const [copied, setCopied] = useState(false);
  const attention = ATTENTION[shipment.category];
  const origin = formatPlace(shipment.origin) ?? "Origin pending";
  const destination = formatPlace(shipment.destination) ?? "Destination pending";
  const current = stepIndex(shipment.category);
  const marker = ((current + 0.5) / PROGRESS_STEPS.length) * 100;
  const deliveredAt = shipment.category === "delivered" ? shipment.events[0] : null;
  const uspsHref = uspsPageUrl(shipment.trackingNumber);

  if (shipment.handoff) {
    return (
      <article className="mx-auto max-w-3xl" aria-live="polite">
        <p className="text-[11px] uppercase tracking-[0.22em] text-ink-soft">USPS.com</p>
        <h2 className="mt-2 font-display text-[clamp(2.7rem,6vw,4.4rem)] leading-[0.92] tracking-tight">
          See it on USPS
        </h2>
        <p className="mt-4 max-w-xl font-display text-2xl italic leading-snug">{shipment.summary}</p>
        <section className="ticket mt-8 rounded-[1.6rem] px-6 py-6 sm:px-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Tracking number</p>
          <p className="mt-1 font-mono text-lg tracking-wide sm:text-xl">{groupNumber(shipment.trackingNumber)}</p>
          <label className="mt-5 block max-w-md">
            <span className="text-[11px] uppercase tracking-[0.16em] text-ink-soft">On your desk</span>
            <Input
              value={nickname}
              onValueChange={onNickname}
              placeholder="Name this parcel"
              maxLength={60}
              aria-label="Parcel nickname, stored on this device"
              className="mt-1 h-11 rounded-none border-0 border-b border-ink/15 bg-transparent px-0 font-display text-2xl shadow-none focus-visible:border-seal focus-visible:ring-0 md:text-2xl"
            />
          </label>
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={uspsHref}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-11 items-center rounded-full bg-navy px-5 text-sm font-medium text-paper hover:bg-navy-2"
            >
              Open live scans
            </a>
            <Button type="button" variant="outline" className="h-11 rounded-full bg-ticket px-4" onClick={onRemove}>
              Remove
            </Button>
          </div>
        </section>
        <p className="mt-4 text-xs leading-5 text-ink-soft">
          The nickname stays in this browser. USPS keeps the scan history.
        </p>
      </article>
    );
  }

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(shipment.trackingNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="mx-auto max-w-3xl" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-ink-soft">
            {shipment.mailClass ?? "USPS"}
            {shipment.sample ? " · Sample" : ""}
          </p>
          <h2 className="mt-2 font-display text-[clamp(2.7rem,6vw,4.4rem)] leading-[0.92] tracking-tight">
            {CATEGORY_LABEL[shipment.category]}
          </h2>
        </div>
        {shipment.category === "delivered" ? (
          <p className="stamp rounded-full border-2 border-moss px-4 py-2 text-sm font-medium uppercase tracking-[0.18em] text-moss">
            Delivered
          </p>
        ) : null}
      </div>

      {attention ? <p className="mt-4 text-sm font-medium text-seal">{attention}</p> : null}
      <p className="mt-4 max-w-2xl font-display text-2xl italic leading-snug text-ink/90">{shipment.summary}</p>

      {error ? (
        <p className="mt-4 rounded-2xl bg-[#f6e4dc] px-4 py-3 text-sm leading-6 text-seal" role="status">
          {error.message} Showing the last result on the desk.
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <PlaceBlock label="From" value={origin} />
        <PlaceBlock label="To" value={destination} align="sm:text-right" />
      </div>
      <div className="relative mt-4 h-3">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[repeating-linear-gradient(90deg,#1c1712_0_7px,transparent_7px_13px)] opacity-35" />
        <span
          className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-seal ring-4 ring-stage"
          style={{ left: `calc(${marker}% - 6px)` }}
        />
      </div>

      <ol className="mt-6 grid grid-cols-5 gap-2">
        {PROGRESS_STEPS.map((step, index) => {
          const reached = index <= current;
          const troubled =
            (shipment.category === "alert" || shipment.category === "returned") && index === current;
          return (
            <li key={step.id}>
              <div className={cn("h-1 rounded-full", reached ? (troubled ? "bg-seal" : "bg-navy") : "bg-ink/10")} />
              <p className={cn("mt-2 text-[10px] uppercase tracking-[0.14em] sm:text-[11px]", reached ? "text-ink" : "text-ink-soft/70")}>
                {step.label}
              </p>
            </li>
          );
        })}
      </ol>

      <section className={cn("ticket mt-8 rounded-[1.6rem] px-6 py-6 sm:px-8", loading && "scan-bar")}>
        <div className="grid gap-6 sm:grid-cols-[4.25rem_minmax(0,1fr)]">
          <div className="hidden items-center justify-center border-r border-dashed border-ink/15 sm:flex">
            <p className="vertical-label text-ink-soft">{shipment.mailClass ?? "USPS"}</p>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Tracking number</p>
                <p className="mt-1 font-mono text-lg tracking-wide sm:text-xl">{groupNumber(shipment.trackingNumber)}</p>
              </div>
              <p className="text-xs text-ink-soft">{formatUpdated(shipment.fetchedAt)}</p>
            </div>

            <label className="mt-5 block max-w-md">
              <span className="text-[11px] uppercase tracking-[0.16em] text-ink-soft">On your desk</span>
              <Input
                value={nickname}
                onValueChange={onNickname}
                placeholder="Name this parcel"
                maxLength={60}
                aria-label="Parcel nickname, stored on this device"
                className="mt-1 h-11 rounded-none border-0 border-b border-ink/15 bg-transparent px-0 font-display text-2xl shadow-none focus-visible:border-seal focus-visible:ring-0 md:text-2xl"
              />
            </label>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <Meta
                label={shipment.category === "delivered" ? "Delivered" : "Expected"}
                value={
                  shipment.category === "delivered"
                    ? deliveredAt
                      ? (formatEventWhen(deliveredAt) ?? "Date pending")
                      : "Date pending"
                    : shipment.expectedDelivery
                      ? formatExpected(shipment.expectedDelivery)
                      : "No date yet"
                }
              />
              {shipment.services.length > 0 ? (
                <Meta label="Services" value={shipment.services.join(" · ")} />
              ) : null}
            </div>

            <div className="mt-6 max-w-md opacity-80">
              <Barcode value={shipment.trackingNumber} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-9 rounded-full bg-ticket px-3" onClick={onRefresh} disabled={loading}>
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
              <Button type="button" variant="outline" className="h-9 rounded-full bg-ticket px-3" onClick={() => void copyNumber()}>
                {copied ? "Copied" : "Copy number"}
              </Button>
              <a
                href={uspsHref}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-9 items-center rounded-full border border-border bg-ticket px-3 text-sm font-medium hover:bg-muted"
              >
                View on USPS.com
              </a>
              <Button type="button" variant="ghost" className="h-9 rounded-full px-3 text-ink-soft" onClick={onRemove}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="scans-heading">
        <h3 id="scans-heading" className="font-display text-3xl tracking-tight">
          Scans
        </h3>
        <ol className="mt-5">
          {shipment.events.map((event, index) => {
            const where = formatEventWhere(event);
            const when = formatEventWhen(event);
            return (
              <li key={`${event.timestamp ?? "scan"}-${index}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-4">
                <div className="relative flex justify-center">
                  {index < shipment.events.length - 1 ? (
                    <span className="absolute top-3 bottom-0 w-px bg-ink/15" />
                  ) : null}
                  <span className={cn("relative z-10 mt-1.5 size-2.5 rounded-full", index === 0 ? "bg-seal" : "bg-ink/25")} />
                </div>
                <div className="pb-6">
                  <p className={cn("text-base leading-6", index === 0 && "font-medium")}>{event.type}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {[where, when].filter(Boolean).join(" · ") || "Location pending"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      <p className="mt-2 text-xs leading-5 text-ink-soft">
        Scans come from USPS. A nickname never leaves this browser.
        {shipment.sample ? " This history is a sample, not a live package." : ""}
      </p>
    </article>
  );
}

function PlaceBlock({ label, value, align }: { label: string; value: string; align?: string }) {
  return (
    <div className={align}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl leading-none tracking-tight sm:text-4xl">{value}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <p className="max-w-xs">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-ink-soft">{label}</span>
      <span className="mt-1 block leading-5">{value}</span>
    </p>
  );
}

function Barcode({ value }: { value: string }) {
  const bars: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    bars.push((code % 3) + 1, 1, ((code >> 2) % 2) + 1, 1);
  }
  const width = bars.reduce((sum, bar) => sum + bar, 0);
  let cursor = 0;
  return (
    <svg viewBox={`0 0 ${width} 36`} className="h-11 w-full" role="img" aria-hidden="true">
      {bars.map((bar, index) => {
        const x = cursor;
        cursor += bar;
        if (index % 2 !== 0) return null;
        return <rect key={`${value}-${index}`} x={x} y="0" width={bar} height="36" fill="#1c1712" />;
      })}
    </svg>
  );
}
