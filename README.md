# Fitarrito Dine-In

Next.js app for dine-in ordering: browse the menu, customize items, and manage your cart.

Meal plan subscriptions live in the separate [fitarrito-subscription](https://github.com/fitarrito/fitarrito-subscription) repo.

## Setup

1. Copy `.env.example` to `.env.local` and add your Supabase credentials.
2. Install dependencies and run the dev server:

```bash
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) — the home page redirects to the Mexican menu.

## Scripts

- `yarn dev` — start development server
- `yarn build` — production build
- `yarn start` — run production server
- `yarn lint` — run ESLint
