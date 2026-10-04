Klimatix provides community flood reporting and flood intelligence for the Philippines.

## Development

```sh
pnpm install
pnpm dev
```

Run a production build with `pnpm build`.

## Account verification for reports and voting

Map, report, announcement, and scorecard viewing remains public. Submitting a flood report or voting requires a signed-in Supabase account. Users can create an account or sign in with a username and password, or use Google sign-in. This uses Supabase Auth, which is already used for the application's database.

To enable it:

1. In Supabase Auth settings, disable email confirmation to allow account access immediately after sign-up. Enable Google and configure its OAuth credentials if Google sign-in is needed.
2. The existing `supabase/migrations/20261003230000_require_verified_accounts_for_writes.sql` still checks Supabase phone/email confirmation in its database write policies. Review that policy before allowing unconfirmed username/password accounts to submit reports or vote.
3. Deploy with the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) configuration.

## Rainfall and report announcement pipeline

Apply `supabase/migrations/20261004000000_weather_pipeline.sql` to add the `weather_observations` table if missing and the pipeline timestamp/index to the existing advisory table. The migration does not recreate existing application tables.

The `/api/announcements/pipeline` endpoint is scheduled hourly on Vercel. Configure `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a high-entropy `CRON_SECRET`. Vercel sends the cron secret as a bearer token; do not expose the service-role key in a `NEXT_PUBLIC_` variable. Open-Meteo rainfall is read for each LGU center and recent reports are grouped to their `lgu_id` (or nearest LGU center if it is missing). The pipeline writes weather observations and updates the latest `alerto_advisories` record per LGU.

Rainfall warning bands are Yellow at 7.5 mm/hour, Orange at 15 mm/hour, and Red at 30 mm/hour. The generated tier is `ACT` for Red rainfall, a Severe peak report, or at least five recent reports; `PREPARE` for Orange rainfall, average severity of Moderate or higher, or at least three reports; otherwise `MONITORED`. Monthly scorecards count reports and LGU-announced advisories; `score` is the percentage of resolved advisories that were followed (zero if none are resolved). These bands provide community decision support, not official PAGASA warnings. TCWS is left unchanged because Open-Meteo does not provide PAGASA TCWS signals.

## Project layout

- `app/` contains routes and their route-specific UI.
- `components/auth/` contains the Supabase username/password and Google account flow.
- `components/reports/` contains the flood-report form and location picker.
- `components/ui/` contains shared interface primitives.
- `lib/` contains report, advisory, map, and Supabase helpers.
- `public/` contains static app icons and assets.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
