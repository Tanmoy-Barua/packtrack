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

## Live USPS scans

Waybill calls the [USPS Tracking API](https://developers.usps.com/) (`https://apis.usps.com/tracking/v3/tracking/{number}?expand=DETAIL`). The server reads:

- `USPS_CONSUMER_KEY`
- `USPS_CONSUMER_SECRET`

Those are the Consumer Key and Consumer Secret from a USPS developer app. Without them, the desk still runs and the sample shipments stay available. USPS may only return packages tied to the Mailer ID on the developer account.

Nicknames are never sent with a lookup.
