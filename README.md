Klimatix provides community flood reporting and flood intelligence for the Philippines.

## Development

```sh
pnpm install
pnpm dev
```

Run a production build with `pnpm build`.

## Account verification for reports and voting

Map, report, announcement, and scorecard viewing remains public. Submitting a flood report or voting requires a signed-in Supabase account with a confirmed phone number or email. Users can sign in with a one-time code sent by SMS or email; this uses Supabase Auth, which is already used for the application's database.

To enable it:

1. In Supabase Auth settings, enable Phone and Email sign-in. Configure an SMS provider for phone codes and configure the email template to send the OTP token (`{{ .Token }}`) for email codes.
2. Apply `supabase/migrations/20261003230000_require_verified_accounts_for_writes.sql` to the existing Supabase database. It adds ownership fields, allows public report reads, and restricts report and vote inserts to the authenticated user's own verified account.
3. Deploy with the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) configuration.

Phone numbers should be entered in international format (for example, `+639XXXXXXXXX`). The OTP itself establishes and verifies the account; it is not an additional factor layered on top of a password.

## Project layout

- `app/` contains routes and their route-specific UI.
- `components/auth/` contains the Supabase phone/email OTP access flow.
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
