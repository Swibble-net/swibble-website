# Swibble Website

Next.js website for Swibble, including API routes for the contact form.

## Requirements

- Node.js 20.9 or newer (see `.nvmrc`)

## Getting Started

Install dependencies:

```bash
pnpm install
```

Copy `.env.local.sample` to `.env.local` and set your SMTP credentials for the contact form.

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `dev` — start the development server
- `build` — create a production build
- `start` — run the production server
- `lint` — run ESLint
