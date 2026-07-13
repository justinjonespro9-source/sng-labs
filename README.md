# SNG Labs

Public marketing site for SNG Labs LLC — a Minnesota innovation studio building original platforms across sports technology, fan engagement, advertising, prediction markets, and verified participation.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Launch configuration

Update the labeled constants in [`lib/site.ts`](lib/site.ts) before production:

- `PRODUCTION_SITE_URL`
- `PUBLIC_CONTACT_EMAIL`
- `PENDING_PRODUCT_URLS` (Handicap Hero, Stadium Slop, Team-M8tes)

Replace image assets in `/public` with final originals:

- `sng-labs-logo.png`
- `innovation-lab.jpg`

## Scripts

```bash
npm run lint
npm run build
npm start
```
