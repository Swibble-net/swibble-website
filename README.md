# Swibble Website

Marketing website for [Swibble](https://swibble.net) — a digital agency based in Aachen, Germany. Built with Next.js (Pages Router), TypeScript, Tailwind CSS, and Sass.

Beyond the marketing pages, the site includes a small self-hosted CMS at `/admin` that manages three kinds of content in Firebase: **blog posts**, **link-tree profiles**, and **video embeds**.

## Features

- **Landing page** — hero, services, portfolio showcase, video carousel, partner logo carousel, latest blog posts, contact form
- **Navigation** — Über uns, Portfolio, Videos, Blog, Kontakt (smooth scroll to sections on the home page)
- **Blog** — post list with search + newest/oldest sorting (`/blog`), individual post pages (`/blog/[slug]`), draft/publish workflow
- **Linkhub** — customer-specific "link in bio" pages (`/linkhub/[slug]`), each with its own name, logo and link list
- **Videos** — looping, muted YouTube/Vimeo embeds in a lazy-loaded carousel on the home page
- **CMS** — password-protected admin area (`/admin`) managing all three of the above
- **Legal** — Impressum (`/impressum`) and Datenschutzerklärung (`/datenschutz`)
- **Contact form** — sends email via SMTP with Cloudflare Turnstile spam protection (`/api/send-mail`)
- **SEO** — per-page meta tags, Open Graph, Twitter cards, JSON-LD (`Organization`, `WebSite`, `BlogPosting`), dynamic `sitemap.xml`
- **AI discovery** — `public/llms.txt` and `public/llms-full.txt` for LLM-readable site summaries

## Tech stack

| | |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (Pages Router) |
| UI | React 19, Tailwind CSS 4, Sass modules |
| Email | Nodemailer (SMTP) |
| Content data | [Firebase Firestore](https://firebase.google.com/docs/firestore) via the Admin SDK (server-side only) |
| Auth | Custom HMAC-signed session cookie (no external auth provider) |
| Package manager | pnpm (see `packageManager` in `package.json`) |

## Requirements

- Node.js **24.x** LTS — pinned to **24.16.0** in `.nvmrc` (matches Vercel's supported runtime)
- pnpm (via Corepack: `corepack enable`)

## Getting started

```bash
pnpm install
cp .env.local.sample .env.local
```

Fill in `.env.local` (see [Environment variables](#environment-variables)), then:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The site runs without Firebase — the blog, linkhub and video sections simply render empty — but the CMS needs it to save anything.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server |
| `pnpm build` | Production build (also type-checks) |
| `pnpm start` | Serve production build |
| `pnpm lint` | Run ESLint |

## Project structure

```
├── components/
│   ├── Layout/            # Header, Footer, page shell
│   ├── BurgerMenu/        # Mobile navigation
│   ├── blog/              # BlogCard, PostEditor, LatestPosts slider
│   ├── linkhub/           # ProfileEditor (link-tree CMS form)
│   ├── videos/            # VideoCarousel (lazy iframe slider)
│   └── SEO.tsx            # Reusable SEO + JSON-LD head tags
├── hooks/                 # Custom hooks (e.g. scroll position)
├── lib/
│   ├── firebaseAdmin.ts   # Firebase Admin SDK init
│   ├── adminAuth.ts       # Signed-cookie admin session
│   ├── navLinks.ts        # Shared nav (desktop + mobile)
│   ├── blog/              # Post CRUD, types, slug + date helpers
│   ├── linkhub/           # Profile CRUD, types
│   └── videos/            # Video CRUD, types, embed-URL normalisation
├── pages/
│   ├── api/send-mail.ts   # Contact form
│   ├── api/admin/         # CMS login / logout
│   ├── api/posts/         # Blog CRUD (admin-guarded mutations)
│   ├── api/linkhub/       # Linkhub CRUD (admin-guarded mutations)
│   ├── api/videos/        # Video CRUD (admin-guarded mutations)
│   ├── admin/             # CMS: blog, linkhub, videos
│   ├── blog/              # Blog list + post pages
│   ├── linkhub/[slug].tsx # Public link-tree page
│   ├── impressum/
│   └── datenschutz/
├── public/                # Static assets (images, logos, icons)
└── styles/                # Global CSS + SCSS modules
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — all main sections |
| `/blog` | Blog list — search + newest/oldest sort |
| `/blog/[slug]` | Single blog post (renders stored HTML) |
| `/linkhub/[slug]` | Link-tree page for one customer (noindex, no site chrome) |
| `/impressum` | Impressum (noindex) |
| `/datenschutz` | Privacy policy (noindex) |
| `/card` | Business card page |
| `/redirect/poster` | Poster redirect |
| `/sitemap.xml` | Generated sitemap incl. published posts |

Admin routes (all login-gated and `noindex`):

| Route | Description |
|-------|-------------|
| `/admin/login` | CMS login |
| `/admin` | Blog dashboard |
| `/admin/new` · `/admin/edit/[id]` | Post editor with live HTML preview |
| `/admin/linkhub` | Linkhub profile list |
| `/admin/linkhub/new` · `/admin/linkhub/edit/[id]` | Link-tree editor |
| `/admin/videos` | Add / remove carousel videos |

Home page sections (anchor links):

| Section | ID |
|---------|-----|
| Über uns (services) | `#uber-uns` |
| Portfolio | `#portfolio` |
| Videos | `#videos` |
| Kontakt | `#kontakt` |

## Architecture

### Data access

All Firestore access happens **server-side** through the Firebase Admin SDK
(`lib/firebaseAdmin.ts`). No Firebase credentials ever reach the browser, and
Firestore security rules can stay fully locked down because the Admin SDK
bypasses them.

Pages fetch their data in `getServerSideProps`; the browser only calls the API
routes for mutations from the CMS. Each feature has its own data module
(`lib/blog/posts.ts`, `lib/linkhub/profiles.ts`, `lib/videos/videos.ts`) that
owns one Firestore collection:

| Collection | Contents |
|------------|----------|
| `posts` | Blog posts |
| `linkhubs` | Link-tree profiles |
| `videos` | Video embed URLs |

Collections are created automatically on first save.

### Admin authentication

The CMS uses a deliberately small, dependency-free auth layer (`lib/adminAuth.ts`):
logging in with `ADMIN_PASSWORD` sets an HTTP-only session cookie signed with
`ADMIN_SESSION_SECRET` (HMAC via Node's `crypto`). Admin pages verify it in
`getServerSideProps`; mutating API routes verify it via `requireAdmin()`.

This is intentionally *not* Firebase Auth, so the Firebase project can be
swapped without touching login.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | Yes (contact form) | SMTP server hostname |
| `SMTP_PORT` | Yes | SMTP port (e.g. `587`) |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASSWORD` | Yes | SMTP password |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes (contact form) | Cloudflare Turnstile site key — gates the submit button client-side |
| `FIREBASE_PROJECT_ID` | Yes (CMS) | Firebase project id from the service account JSON |
| `FIREBASE_CLIENT_EMAIL` | Yes (CMS) | Service account email |
| `FIREBASE_PRIVATE_KEY` | Yes (CMS) | Service account private key (keep the `\n` escapes, wrap in quotes) |
| `ADMIN_PASSWORD` | Yes (CMS) | Password for the `/admin` login |
| `ADMIN_SESSION_SECRET` | Recommended | Random secret used to sign the admin session cookie |

Without valid SMTP credentials the contact form fails on submit. Without the
`FIREBASE_*` variables the blog, linkhub and video sections render empty states
and the CMS cannot save.

Create a Turnstile site key in the [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/turnstile) and add your domains (e.g. `swibble.net` plus `localhost` for local dev).

### Firebase setup

1. Create a project in the [Firebase console](https://console.firebase.google.com/) and enable **Firestore Database**.
2. Go to **Project settings → Service accounts → Generate new private key**. This downloads a JSON file.
3. Copy these values into `.env.local`:
   - `FIREBASE_PROJECT_ID` ← `project_id`
   - `FIREBASE_CLIENT_EMAIL` ← `client_email`
   - `FIREBASE_PRIVATE_KEY` ← `private_key` (keep it wrapped in quotes so the `\n` escapes survive)
4. Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (e.g. `openssl rand -hex 32`).
5. Restart `pnpm dev`, open `/admin`, and log in.

### Switching to the client's Firebase project

Because all access goes through the Admin SDK using environment variables,
moving from the test project to the client's project is a swap of three values —
**no code changes**:

1. Get a service account key JSON from the client's Firebase project.
2. Replace `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` (locally and in Vercel).
3. Redeploy / restart. Documents stay in whichever project owns them, so migrate them if needed.

## Blog & CMS

The editor (`/admin/new`) takes raw **HTML** for the body with a live preview.
Cards and post pages render that HTML, styled by the `.blog-content` rules in
`styles/globals.css`. Each post stores: title, slug (auto-generated if blank),
author, optional cover image URL + alt text (falls back to the title), excerpt
(auto-derived if blank), a visibility flag, publish date and last-changed date.

### Drafts (show / hide)

Every post has a **published** flag toggled by a switch in the editor:

- New posts default to **hidden** (draft) so they can be reviewed first.
- Drafts are excluded from `/blog`, the home page slider and the sitemap, and
  visitors hitting the URL directly get a 404. A logged-in admin can still open
  the URL to preview it (with an "Entwurf-Vorschau" banner).
- The dashboard shows a **Sichtbar / Versteckt** status and an **Anzeigen /
  Verstecken** quick toggle (`PATCH /api/posts/[id]` with `{ published }`).
- Posts created before this feature existed are treated as visible.

## Linkhub (link-tree pages)

Each Firestore document in `linkhubs` is one shareable "link in bio" page served
at `/linkhub/<slug>` — for example `/linkhub/swibble`. Unknown slugs return 404.
The page opts out of the site header/footer via the `getLayout` pattern in
`pages/_app.tsx`, so it renders full-screen and mobile-first, and it is `noindex`.

Manage profiles under `/admin/linkhub`. A profile has:

| Field | Notes |
|-------|-------|
| Name | Shown as the page heading |
| Slug | URL path; auto-generated from the name if left blank, and de-duplicated |
| Tagline | Optional line under the name |
| Logo URL | Optional; falls back to the Swibble logo |
| Links | Ordered list, reorderable with ↑ ↓ |

Each link has an icon (any text/emoji), a label, an optional sub-label, a URL,
an "open in new tab" flag, and an "accent" flag that renders it as the
highlighted purple card.

## Videos

Videos appear in a carousel on the home page (`#videos`) and are managed at
`/admin/videos` — paste a link, optionally give it a title, and it is added to
the end of the carousel. There is no edit step: add or delete.

**Link normalisation.** On save, `lib/videos/embed.ts` converts a pasted link
into an embed URL configured to autoplay muted and loop forever. It understands
the common YouTube shapes (`watch`, `shorts`, `youtu.be`, `embed`) and Vimeo.
Anything it doesn't recognise is stored unchanged, so other embeddable URLs
still work.

**Performance.** Embeds are heavy, so the carousel avoids paying for them up front:

- No iframe exists in the initial HTML. Each slide renders only a thumbnail.
- An `IntersectionObserver` mounts the iframe when the slide comes within 600px
  of the viewport, so videos far off-screen are never requested.
- YouTube is embedded via `youtube-nocookie.com`.

**Thumbnails** are derived at render time from the stored embed URL rather than
saved in Firestore — YouTube stills come from Google's `i.ytimg.com` CDN, Vimeo
stills from the third-party `vumbnail.com` service. The thumbnail stays on top
of the iframe until the player reports it is actually playing (via the player's
postMessage API), which avoids a flash of the player's black background, then
fades out.

## Partner logos

Add a logo file under `public/companies_logos/` and register it in
`lib/companiesLogos.ts`. The carousel picks it up automatically.

## Deploying to Vercel

- Production should track the branch you merge into (usually `main`).
- `vercel.json` runs `corepack enable && pnpm install --frozen-lockfile` so Vercel uses **pnpm 10.12.1** from `packageManager`.
- Commit **`pnpm-lock.yaml`** with every dependency change.
- Set the SMTP, Turnstile, `FIREBASE_*` and `ADMIN_*` env vars in the Vercel project settings. For `FIREBASE_PRIVATE_KEY`, paste the key with literal `\n` sequences (Vercel stores it verbatim; the app converts them back to newlines).

## License

MIT — see [LICENSE](LICENSE).
