"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-stage px-6 text-ink">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-ink-soft">Waybill</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight">The desk hit a snag.</h1>
        <p className="mt-3 text-base leading-7 text-ink-soft">
          Reload this view. Parcels saved on this device stay where you left them.
        </p>
        <Button
          type="button"
          className="mt-6 h-11 rounded-full px-5"
          onClick={() => reset()}
        >
          Try again
        </Button>
      </div>
    </main>
  );
}
