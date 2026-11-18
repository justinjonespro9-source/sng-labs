# Growth brand init — Production approval gate

Phase 1 code ships ExactStat and VoteYourCast onboarding scripts in **dry-run by default**. Do **not** run Production `--apply` until each brand has a separate, explicit approval after Preview/local verification.

## Dry-run (safe; default)

```bash
npm run growth:init-exactstat
npm run growth:init-voteyourcast
```

Each prints a plan (`create_brand` / brain / DEVELOPMENT draft). No writes without `--apply`.

## Production apply (requires separate approval)

Only after an operator explicitly approves the Production write for that brand:

```bash
npm run growth:init-exactstat -- --apply --approved-production-host=<production-db-hostname>
npm run growth:init-voteyourcast -- --apply --approved-production-host=<production-db-hostname>
```

- `<production-db-hostname>` must match the `DATABASE_URL` host exactly.
- Scripts refuse Production when the host gate fails (host fragment `ep-snowy-star-awqzs6ol` or `VERCEL_ENV=production`).
- Never print connection strings.
- Apply creates only: brand key, brain v1, one DEVELOPMENT DRAFT brief. No priorities, campaigns, or social accounts.

## Status

| Brand | Code | Production apply |
|---|---|---|
| ExactStat (`exactstat`) | Ready | **Blocked — awaiting separate approval** |
| VoteYourCast (`vote-your-cast`) | Ready | **Blocked — awaiting separate approval** |
