import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABEL } from "@/lib/status";
import type { ShelfItem } from "@/lib/shelf";
import type { SampleCard } from "@/lib/samples";
import type { StatusCategory, TrackCode } from "@/lib/types";
import { cn } from "cn";

type DeskRailProps = {
  query: string;
  onQuery: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  live: boolean | null;
  shelf: ShelfItem[];
  activeNumber: string | null;
  errorCode: TrackCode | null;
  samples: SampleCard[];
  shipmentOpen: boolean;
  onOpen: (trackingNumber: string, sample: boolean) => void;
  onRemove: (trackingNumber: string) => void;
};

function dotClass(category: StatusCategory): string {
  switch (category) {
    case "delivered":
      return "bg-moss";
    case "alert":
    case "returned":
    case "delivery_attempted":
      return "bg-[#e7b2a6]";
    case "out_for_delivery":
      return "bg-[#e3b15a]";
    default:
      return "bg-[#8fb3d9]";
  }
}

export function DeskRail({
  query,
  onQuery,
  onSubmit,
  loading,
  live,
  shelf,
  activeNumber,
  errorCode,
  samples,
  shipmentOpen,
  onOpen,
  onRemove,
}: DeskRailProps) {
  return (
    <aside className="bg-navy text-paper lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto">
      <div className="px-5 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-seal font-display text-xl text-paper">
            W
          </span>
          <div>
            <p className="font-display text-[1.7rem] leading-none tracking-tight">Waybill</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/50">USPS desk</p>
          </div>
        </div>

        <div className={cn("mt-8", shipmentOpen && "max-lg:mt-5")}>
          <h1
            className={cn(
              "font-display text-[2.35rem] leading-[1.02] tracking-tight text-paper lg:text-[2.6rem]",
              shipmentOpen && "max-lg:sr-only",
            )}
          >
            Paste the number from the label.
          </h1>
          <p className={cn("mt-3 max-w-sm text-sm leading-6 text-white/65", shipmentOpen && "max-lg:hidden")}>
            Twenty-two digits, or an international code ending in US. Nicknames stay on this device.
          </p>
        </div>

        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label htmlFor="tracking" className="text-[11px] uppercase tracking-[0.18em] text-white/70">
            Tracking number
          </label>
          <Input
            id="tracking"
            value={query}
            onValueChange={onQuery}
            placeholder="9400 1118 9922 …"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={48}
            aria-invalid={errorCode === "invalid"}
            className="mt-2 h-12 rounded-xl border-white/20 bg-white/10 px-3 font-mono text-[15px] tracking-wide text-paper placeholder:text-white/50 focus-visible:border-white/50 focus-visible:ring-white/25 md:text-[15px]"
          />
          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 w-full rounded-xl bg-paper text-[15px] text-navy hover:bg-white"
          >
            {loading ? "Asking USPS…" : "Track"}
          </Button>
        </form>

        {live === false ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm leading-6 text-white/70">
            Live scans turn on when USPS credentials are connected. Sample shipments below are ready now.
          </p>
        ) : null}

        <section className="mt-8" aria-labelledby="shelf-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="shelf-heading" className="text-[11px] uppercase tracking-[0.18em] text-white/50">
              On this desk
            </h2>
            <span className="text-xs text-white/40">{shelf.length}</span>
          </div>
          {shelf.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-white/55">
              Parcels you track land here, and only on this device.
            </p>
          ) : (
            <ul className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:block lg:space-y-2 lg:overflow-visible lg:px-0">
              {shelf.map((item) => {
                const active = item.trackingNumber === activeNumber;
                const label = item.nickname.trim() || "Untitled parcel";
                return (
                  <li key={item.trackingNumber} className="min-w-[78%] snap-start lg:min-w-0">
                    <div
                      className={cn(
                        "flex items-stretch rounded-2xl border",
                        active ? "border-white/30 bg-white/12" : "border-white/10 bg-white/5",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onOpen(item.trackingNumber, item.sample)}
                        className="min-w-0 flex-1 px-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7b2a6]"
                      >
                        <span className="flex items-center gap-2">
                          <span className={cn("size-1.5 shrink-0 rounded-full", dotClass(item.category))} />
                          <span className="truncate font-display text-lg leading-none">{label}</span>
                        </span>
                        <span className="mt-1.5 flex items-center gap-2 pl-3.5 text-xs text-white/55">
                          <span className="truncate">{CATEGORY_LABEL[item.category]}</span>
                          {item.sample ? (
                            <Badge className="h-4 bg-white/10 px-1.5 text-[10px] text-paper">Sample</Badge>
                          ) : null}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(item.trackingNumber)}
                        className="px-3 text-xs uppercase tracking-[0.14em] text-white/45 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e7b2a6]"
                        aria-label={`Remove ${label} from this desk`}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={cn("mt-8", shipmentOpen && "max-lg:hidden")} aria-labelledby="sample-heading">
          <h2 id="sample-heading" className="text-[11px] uppercase tracking-[0.18em] text-white/50">
            Sample shipments
          </h2>
          <ul className="mt-3 space-y-2">
            {samples.map((sample) => (
              <li key={sample.trackingNumber}>
                <button
                  type="button"
                  onClick={() => onOpen(sample.trackingNumber, true)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7b2a6]"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-xl leading-none">{sample.title}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-white/40">Sample</span>
                  </span>
                  <span className="mt-1.5 block text-sm text-white/75">{sample.route}</span>
                  <span className="mt-1 block text-xs leading-5 text-white/45">{sample.blurb}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
