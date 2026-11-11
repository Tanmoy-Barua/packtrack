# Waybill

A private desk for USPS packages. Paste a tracking number, read the latest scan, and keep the parcels you care about on this device with names only you chose.

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js. The dev server listens on port **3847**.

## What you can do

- Track a USPS number: 20–34 digits, or an international code such as `EA123456789US`.
- Open a sample shipment to see a full timeline before live lookup is connected.
- Name a parcel. The nickname stays in this browser.
- Refresh a result, copy the number, or open the same number on USPS.com.
- Remove a parcel from the desk. That only clears this browser.

## Live scans

A real tracking number opens on USPS.com. That page does not need a business account. Waybill keeps the number and the nickname on this device.

Sample shipments show a full scan history inside the desk.

A USPS Business Account can optionally connect the Tracking API. The server then reads `USPS_CONSUMER_KEY` and `USPS_CONSUMER_SECRET`. Nicknames are never sent with a lookup.
