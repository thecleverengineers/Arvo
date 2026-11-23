# Arvo

Arvo is a mobile-first luxury investment platform interface. The current starter focuses on the customer experience and is built with React and Vite.

## Run locally

```bash
npm install
npm run dev
```

## Included in this starter

- A responsive dashboard with a persistent top header and five-icon bottom app bar
- Five selectable themes: Emerald Luxe, Obsidian Gold, Ivory Champagne, Midnight Sapphire and Burgundy Rose
- Dedicated investment plan profiles, wallet, referral and profile screens
- A three-level referral overview
- A mobile OTP sign-in interface, ready for a server-side Fast2SMS integration
- Sample portfolio, plan and transaction data for visual prototyping

## Integration status

The screens currently use illustrative data. OTP sending and verification are not connected to Fast2SMS yet. Add provider credentials to a server-side environment only; never put an API key in browser code or a `VITE_*` variable. Deposit, transfer, withdrawal, verification and admin workflows still need backend services and their corresponding screens.

Plan terms, ranges and rewards shown in the preview are placeholders and are not investment advice or a promise of returns.
