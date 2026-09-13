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

Then run:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Google OAuth should allow the production callback URL `https://www.snglabs.com/api/auth/callback/google`.
