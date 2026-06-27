# Swibble Website

Marketing website for [Swibble](https://swibble.net) — a digital agency based in Aachen, Germany. Built with Next.js (Pages Router), TypeScript, Tailwind CSS, and Sass.

## Features

- **Landing page** — hero, services, portfolio showcase, partner logo carousel, contact form
- **Navigation** — Über uns, Portfolio, Blog, Kontakt (smooth scroll to sections on the home page)
- **Blog** — post list with search + newest/oldest sorting (`/blog`), individual post pages (`/blog/[slug]`), posts fetched server-side from Firebase
- **CMS** — password-protected admin area (`/admin`) to create, edit and delete posts with a live HTML editor
- **Impressum** — legal notice (`/impressum`)
- **Contact form** — sends email via SMTP (`/api/send-mail`)
- **SEO** — per-page meta tags, Open Graph, Twitter cards, JSON-LD (`Organization`, `WebSite`)
- **Partner carousel** — infinite scroll of client logos from `public/companies_logos/`
- **AI discovery** — `public/llms.txt` and `public/llms-full.txt` for LLM-readable site summaries (served at `/llms.txt`)

## Tech stack

| | |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (Pages Router) |
| UI | React 19, Tailwind CSS 4, Sass modules |
| Email | Nodemailer (SMTP) |
| Blog data | [Firebase Firestore](https://firebase.google.com/docs/firestore) via the Admin SDK (server-side) |
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
├── lib/blog/            # Blog server functions (Firestore access), types, helpers
├── lib/firebaseAdmin.ts # Firebase Admin SDK init
├── lib/adminAuth.ts     # Signed-cookie admin session for the CMS
├── pages/               # Next.js routes
│   ├── api/send-mail.ts # Contact form API
│   ├── api/posts/       # Blog CRUD API (admin-guarded mutations)
│   ├── api/admin/       # CMS login / logout
│   ├── admin/           # CMS (login, dashboard, post editor)
│   ├── blog/            # Blog list + post pages
│   └── impressum/       # Legal page
├── public/              # Static assets (images, logos, icons)
├── styles/              # Global CSS + SCSS modules
└── components/SEO.tsx   # Reusable SEO + JSON-LD head tags
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — all main sections |
| `/blog` | Blog list — search + newest/oldest sort |
| `/blog/[slug]` | Single blog post (renders stored HTML) |
| `/admin` | CMS dashboard (login required, noindex) |
| `/admin/login` | CMS login |
| `/admin/new` · `/admin/edit/[id]` | Post editor with live HTML preview |
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
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes (contact form) | Cloudflare Turnstile site key — gates the submit button client-side |
| `FIREBASE_PROJECT_ID` | Yes (blog) | Firebase project id from the service account JSON |
| `FIREBASE_CLIENT_EMAIL` | Yes (blog) | Service account email |
| `FIREBASE_PRIVATE_KEY` | Yes (blog) | Service account private key (keep the `\n` escapes, wrap in quotes) |
| `ADMIN_PASSWORD` | Yes (CMS) | Password for the `/admin` login |
| `ADMIN_SESSION_SECRET` | Recommended | Random secret used to sign the admin session cookie |

Without valid SMTP credentials, the contact form will fail on submit. Without the `FIREBASE_*` variables the blog renders an empty state and the CMS cannot save.

## Blog & CMS

Blog posts live in a Firestore collection called **`posts`** and are read on the
server via the Firebase Admin SDK (`lib/blog/posts.ts`). Mutations (create / edit /
delete) go through admin-guarded API routes under `pages/api/posts/`.

### Firebase setup (test project first)

1. Create a project in the [Firebase console](https://console.firebase.google.com/) and enable **Firestore Database**.
2. Go to **Project settings → Service accounts → Generate new private key**. This downloads a JSON file.
3. Copy these values into `.env.local`:
   - `FIREBASE_PROJECT_ID` ← `project_id`
   - `FIREBASE_CLIENT_EMAIL` ← `client_email`
   - `FIREBASE_PRIVATE_KEY` ← `private_key` (keep it wrapped in quotes so the `\n` escapes survive)
4. Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (e.g. `openssl rand -hex 32`).
5. Restart `pnpm dev`, open `/admin`, log in, and create your first post.

Firestore security rules can stay locked down — all access is through the Admin
SDK on the server, which bypasses client rules. The collection and documents are
created automatically on the first save.

### Switching to the client's Firebase project

Because all access goes through the Admin SDK using environment variables, moving
from the test project to the client's project is just a swap of three values —
**no code changes**:

1. Get a service account key JSON from the client's Firebase project.
2. Replace `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` (locally and in Vercel).
3. Redeploy / restart. Existing posts stay in whichever project owns them, so migrate documents if needed.

### Writing posts

The editor (`/admin/new`) takes raw **HTML** for the body with a live preview.
Cards and post pages render that HTML, styled by the `.blog-content` rules in
`styles/globals.css`. Each post stores: title, slug (auto-generated if blank),
author, optional cover image URL, excerpt (auto-derived if blank), publish date
and last-changed date.

Create a Turnstile site key in the [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/turnstile) and add your domain (e.g. `swibble.net`, `localhost` for local dev).

## Deploying to Vercel

- Production should track the branch you merge into (usually `main`).
- `vercel.json` runs `corepack enable && pnpm install --frozen-lockfile` so Vercel uses **pnpm 10.12.1** from `packageManager`.
- Commit **`pnpm-lock.yaml`** with every dependency change.
- Set SMTP, `FIREBASE_*` and `ADMIN_*` env vars in the Vercel project settings. For `FIREBASE_PRIVATE_KEY`, paste the key with literal `\n` sequences (Vercel stores it verbatim; the app converts them back to newlines).

## License

MIT — see [LICENSE](LICENSE).
