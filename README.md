# Arvo

Arvo is a mobile-first wealth platform starter. It includes a React/Vite client and an Express/MongoDB API for account, plan, wallet, referral and administrator workflows.

## Run locally

Install the client and API dependencies:

```bash
npm install
npm --prefix server install
```

Copy `server/.env.example` to `server/.env`, configure a MongoDB replica-set URI, and start the API and client in separate terminals:

```bash
npm run dev:api
npm run dev
```

## Included in this starter

- A responsive dashboard with a persistent top header and icon bottom app bar
- Five selectable themes: Emerald Luxe, Obsidian Gold, Ivory Champagne, Midnight Sapphire and Burgundy Rose
- Dedicated investment plan profiles, wallet, referral and profile screens
- A three-level referral overview
- Mobile OTP sign-in using the Fast2SMS API adapter or a development-only demo mode
- MongoDB-backed user profiles, plan applications, deposits, withdrawals, transfers, wallet ledger and audit trail
- Retry-safe wallet requests using idempotency keys
- Three-level referral tree with counts across the full network
- Member-to-admin support chat with automatic message refresh
- Admin screens for users, plans, deposits, withdrawals, applications, payment instructions, ledger and audit review
- Admin content manager for news, banners, work area, about, services, investors, partners, socials, menu items, logo and icon records
- Published news on the dashboard and published logo/icon records in the app shell
- Email verification through configured SMTP

## Integration status

### Configure authentication

For local UI development, `AUTH_MODE=demo` uses the `DEMO_OTP` value in `server/.env`. Demo mode is disabled automatically in production. For real OTP delivery, set `AUTH_MODE=fast2sms`, `FAST2SMS_API_KEY`, and `FAST2SMS_OTP_ID` on the server. Fast2SMS requires a 10-digit Indian number, an OTP template ID and the authorization header; see its [Send OTP](https://docs.fast2sms.com/reference/send-otp) and [Verify OTP](https://docs.fast2sms.com/reference/verify-otp) API references.

Set `ADMIN_MOBILE` to the administrator's 10-digit number. That account receives the admin role after OTP verification. Set SMTP variables to enable email verification. Never put provider keys in browser code or `VITE_*` variables.

### Money movement and plans

Deposit requests wait for admin confirmation of the external payment reference. Withdrawals reserve the user's available balance and require admin review; payout is recorded after an administrator confirms it. Internal wallet transfers and plan application acceptance use MongoDB transactions. Use MongoDB Atlas or another replica-set deployment for those transactions. Deposit methods currently show administrator-managed payment instructions; no payment gateway or payout provider is connected.

Plans are managed in the admin panel. They have no default return figures or referral commissions. The three-level referral tree records referred accounts; reward rules are not enabled. Publish only products and terms your organisation is authorised to offer, and connect a payment provider only after its merchant account and required regulatory arrangements are in place.

The content manager supports separate language codes per item, but the application interface currently ships in English. Add reviewed translations before offering other interface languages. Support chat persists messages in MongoDB and polls for replies while the chat screen is open.

The app has a basic operational MVP; live SMS, SMTP, MongoDB and payment accounts still require their own credentials and provider-side setup. App data are stored in MongoDB after it is configured.


## Premium themes and administrator publication

Arvo includes five fully separated mobile visual themes:
**Emerald Luxe**, **Obsidian Gold**, **Ivory Champagne**,
**Midnight Sapphire**, and **Burgundy Rose**.

The entire app uses one **globally active** theme stored in
`PlatformSettings.activeTheme` in MongoDB (default: `emerald`).
Members cannot override the live theme. Authenticated administrators
can visit **Admin → Themes**, select one of five mobile phone previews,
then click **Publish live theme**. The selection is applied immediately
to the API, saved to the audit log, and picked up on subsequent client
reloads, tab focus, or an automatic 60-second poll.

- `GET /api/settings` returns `activeTheme` and public settings.
- `PATCH /api/admin/theme` accepts
  `{ "activeTheme": "emerald" | "obsidian" | "ivory" | "sapphire" | "burgundy" }`.
- Publication requires a valid admin session and records a
  `theme.published` audit event.
- Theme palette and mock screen previews are in `src/premium.css`;
  components and the publisher UI are in `src/App.jsx`.
- The previews use **illustrative, not account, balance figures**.
  Actual application balances are always loaded from the API.

## Connect Vercel frontend and Render API

**Frontend (Vercel)**: deploy this repository's root as a **Vite** app.
Use `npm ci` and `npm run build`, output directory `dist`.

Set this Vercel environment variable in **Production** (and appropriate Preview):

```env
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

The frontend automatically appends `/api`; an existing `/api` suffix
is also accepted. As Vite bakes this value into the static build,
redeploy after changing it.

**API (Render)**: deploy the `server` directory with
`npm ci` (build command) and `npm start` (start command).
Set the following in the Render environment, using your real values:

```env
NODE_ENV=production
MONGODB_URI=<Atlas replica-set SRV connection string>
JWT_SECRET=<secret string with at least 32 characters>
CLIENT_ORIGIN=https://YOUR-VERCEL-FRONTEND.vercel.app
AUTH_MODE=fast2sms
FAST2SMS_API_KEY=<Render secret>
FAST2SMS_OTP_ID=<your OTP template ID>
ADMIN_MOBILE=<your designated administrator's 10-digit mobile>
```

Do **not** put database credentials, JWT keys, or Fast2SMS credentials
in the Vercel frontend. The `CLIENT_ORIGIN` value must match the
frontend's exact browser origin (protocol and host, without a path).
The API uses cross-origin credentialed requests for session cookies.
Configure HTTPS for both services; cross-site browser policies may
require a same-origin proxy for reliably persistent sessions.

Verify `GET https://YOUR-RENDER-SERVICE.onrender.com/api/health`
returns `{ "ok": true, "service": "arvo-api" }`, then test mobile OTP
login, profile, published theme, and user wallet requests from the
actual frontend domain. The health endpoint verifies that the Express
app started, **not** every Fast2SMS or downstream database operation.

A GitHub Actions verification workflow at
`.github/workflows/verify.yml` checks the Vite production build and
syntax of API source files on pushes to `main`.
