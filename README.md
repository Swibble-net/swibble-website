# Swibble Website

Marketing website for [Swibble](https://swibble.net) — a digital agency based in Aachen, Germany. Built with Next.js (Pages Router), TypeScript, Tailwind CSS, and Sass.

## Features

- **Landing page** — hero, services, portfolio showcase, partner logo carousel, contact form
- **Navigation** — Über uns, Portfolio, Blog, Kontakt (smooth scroll to sections on the home page)
- **Blog** — placeholder page (`/blog`)
- **Impressum** — legal notice (`/impressum`)
- **Contact form** — sends email via SMTP (`/api/send-mail`)
- **SEO** — per-page meta tags, Open Graph, Twitter cards, JSON-LD (`Organization`, `WebSite`)
- **Partner carousel** — infinite scroll of client logos from `public/companies_logos/`

## Tech stack

| | |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (Pages Router) |
| UI | React 19, Tailwind CSS 4, Sass modules |
| Email | Nodemailer (SMTP) |
| Package manager | pnpm (see `packageManager` in `package.json`) |

## Requirements

- Node.js **24.x** LTS — pinned to **24.16.0** in `.nvmrc` (matches Vercel’s supported runtime)
- pnpm (via Corepack: `corepack enable`)

## Getting started

```bash
pnpm install
```

Copy the environment sample and configure SMTP for the contact form:

```bash
cp .env.local.sample .env.local
```

Edit `.env.local`:

```env
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASSWORD=your-password
```

Run the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build |
| `pnpm lint` | Run ESLint |

## Project structure

```
├── components/          # React components (Layout, forms, sections)
├── hooks/               # Custom hooks (e.g. scroll position)
├── lib/                 # Shared logic (nav links, JSON-LD, logos, email)
├── pages/               # Next.js routes
│   ├── api/send-mail.ts # Contact form API
│   ├── blog/            # Blog (coming soon)
│   └── impressum/       # Legal page
├── public/              # Static assets (images, logos, icons)
├── styles/              # Global CSS + SCSS modules
└── components/SEO.tsx   # Reusable SEO + JSON-LD head tags
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — all main sections |
| `/blog` | Blog placeholder |
| `/impressum` | Impressum (noindex) |
| `/card` | Business card page |
| `/redirect/poster` | Poster redirect |

Home page sections (anchor links):

| Section | ID |
|---------|-----|
| Über uns (services) | `#uber-uns` |
| Portfolio | `#portfolio` |
| Kontakt | `#kontakt` |

## Partner logos

Add a logo file under `public/companies_logos/` and register it in `lib/companiesLogos.ts`. The carousel picks it up automatically.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | Yes (contact form) | SMTP server hostname |
| `SMTP_PORT` | Yes | SMTP port (e.g. `587`) |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASSWORD` | Yes | SMTP password |

Without valid SMTP credentials, the contact form will fail on submit.

## License

MIT — see [LICENSE](LICENSE).
