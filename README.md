# SNG Labs

Public marketing site for SNG Labs LLC — a Minnesota innovation studio building original platforms across sports technology, fan engagement, advertising, prediction markets, and verified participation.

The repository also contains the private SNG Marketing Command Center at `/command-center`. It is isolated from the public site by Google authentication, an explicit email allowlist, and server-side authorization.

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
- `innovation-lab-hero.jpg`

## Scripts

```bash
npm run lint
npm run build
npm run typecheck
npm test
npm start
```

## Command Center configuration

Copy `.env.example` to `.env.local` and configure:

- `DATABASE_URL`: PostgreSQL connection used by Prisma.
- `AUTH_SECRET`: Auth.js encryption secret.
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`: Google OAuth credentials.
- `AUTH_ALLOWED_EMAILS`: comma-separated allowlist; the first address is the initial owner.
- `OPENAI_API_KEY`: server-only credential used by AI Lab generation.
- `AI_MODEL`: server-selected model used by AI Lab. No model is hard-coded in the application.

If either AI variable is missing, AI Lab shows generation as unavailable without affecting the rest of the Command Center.

Then run:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Google OAuth should allow the production callback URL `https://www.snglabs.com/api/auth/callback/google`.

## Game-Day Engine V1

Game-Day Engine V1 uses the reviewed, checked-in `data/nfl/2026-regular-season.json` snapshot. Runtime code does not scrape, poll, or call ESPN (or any other schedule provider). The fixture identifies its original source and retrieval timestamp for auditability.

After applying the additive Prisma migration, inspect the import without writing:

```bash
npm run game-day:import-nfl
```

Apply the reviewed snapshot explicitly:

```bash
npm run game-day:import-nfl -- --apply
```

The importer uses `(source, sourceEventId)` as stable event identity, creates missing canonical NFL Market/Team/Venue foundation records, fills only empty foundation fields on existing records, and reports source events that disappeared without deleting them. Re-running it updates schedule changes in place and does not create duplicate events. Recommendation evaluation is a separate, operator-triggered action in `/command-center/live-desk`; it does not invoke AI or create Opportunities until a user accepts a persisted recommendation.
