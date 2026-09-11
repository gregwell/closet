# Closet App

A personal order tracker for online clothing orders that arrive as multiple products at once. Replaces a manual Excel spreadsheet: instead of updating "order status" by hand every time you decide to keep or return one of the products in it, the order's status is **always computed automatically** from the status of its individual products — that's the one rule this app exists to get right.

## Why

Ordering several items in one online order and deciding per-item what to keep and what to return is easy to lose track of in a spreadsheet: nothing forces the "order row" to reflect the current state of every product in it, especially when a decision changes later (e.g. "keeping it" today, "actually returning it" next week). This app derives the order's status from its products every time, so it can never silently drift out of sync — see `src/lib/services/order-status.ts` and `context/foundation/test-plan.md` for how that rule is defined and tested.

## Core Domain

- An **order** (store, order date) has one or more **products** (brand, type, price, description, category).
- Each product has a status: `in_transit → awaiting_decision → kept | to_be_returned → return_shipped → return_received` (with `to_be_returned ⇄ return_shipped` reversible, since a shipped return can be reversed before it's received).
- The **order's** status is never stored — it's computed from its products' statuses by priority (`in_transit` > `awaiting_decision` > `to_be_returned` > else `completed`), so the order automatically shows as needing attention whenever any product in it does.
- Full CRUD on orders (create, list with computed status, update product status, delete) is scoped per signed-in user via Supabase Row-Level Security.

See `context/foundation/prd.md` for the full product requirements and `context/foundation/roadmap.md` for delivery status.

## Tech Stack

- [Astro](https://astro.build/) v6 - Modern web framework with server-first rendering
- [React](https://react.dev/) v19 - UI library for interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4 - Utility-first CSS framework
- [Supabase](https://supabase.com/) - Authentication and backend-as-a-service
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge deployment runtime

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/gregwell/closet.git
cd closet
```

2. Install dependencies:

```bash
npm install
```

3. Set up Supabase and configure environment variables — see [Supabase Configuration](#supabase-configuration) below.

4. Create a `.dev.vars` file for local Cloudflare dev secrets:

```bash
cp .env.example .dev.vars
```

5. Run the development server:

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server (Cloudflare workerd runtime)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint with type-checked rules
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Run Prettier
- `npm test` - Run the unit test suite (see `context/foundation/test-plan.md` for what each test covers and why)

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ ├── api/ # API endpoints (auth, orders)
│ │ ├── auth/ # Sign-in/sign-up pages
│ │ └── orders/ # Order list + create-order pages
│ ├── components/ # UI components (Astro & React)
│ ├── lib/services/ # Business logic + data access (order-status, orders)
│ └── types.ts # Shared domain types
├── supabase/migrations/ # RLS-scoped orders/order_items schema
├── context/foundation/ # PRD, roadmap, test plan
├── public/ # Public assets
├── wrangler.jsonc # Cloudflare Workers config
```

## Supabase Configuration

This project uses [Supabase](https://supabase.com/) for authentication. Environment variables are declared via Astro's `astro:env` schema and are treated as **server-only secrets** — they are never exposed to the client.

### First-time setup (local, no cloud project needed)

Requires [Docker](https://www.docker.com/) and ~7 GB RAM.

1. Create your `.env` file:

```bash
cp .env.example .env
```

2. Initialize the local Supabase project (creates a `supabase/` config folder):

```bash
npx supabase init
```

3. Start the local stack (downloads Docker images on first run):

```bash
npx supabase start
```

4. Copy the credentials printed by the CLI into your `.env` and `.dev.vars`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon key from CLI output>
```

5. To stop the stack when done:

```bash
npx supabase stop
```

The local Studio UI is available at `http://localhost:54323`.

Running `npx supabase start` applies the migrations in `supabase/migrations/`, which create the `orders` and `order_items` tables with Row-Level Security scoping every row to its owning user.

### Using a cloud Supabase project instead

If you prefer to use a hosted Supabase project, add these variables to your `.env` and `.dev.vars` files:

| Variable       | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `SUPABASE_URL` | Project URL from Supabase dashboard → Settings → API       |
| `SUPABASE_KEY` | `anon` public key from Supabase dashboard → Settings → API |

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-key>
```

### Email confirmation in local development

By default Supabase requires email confirmation before a user can sign in. To skip this during local development:

1. Open the Supabase dashboard for your project
2. Go to **Authentication → Email → Confirm email**
3. Toggle it **off**

Users can then sign in immediately after sign-up without clicking a confirmation link.

### Auth routes

| Route                 | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `/auth/signin`        | Email/password sign-in form                                             |
| `/auth/signup`        | Email/password sign-up form                                             |
| `/auth/confirm-email` | Post-signup "check your inbox" page                                     |
| `/dashboard`          | Example protected page (redirects to `/auth/signin` if unauthenticated) |
| `/orders`             | List of the signed-in user's orders, grouped by computed status         |
| `/orders/new`         | Create an order with one or more products                               |

Route protection is handled in `src/middleware.ts`. Add paths to the `PROTECTED_ROUTES` array there to require authentication (currently `/dashboard`, `/orders`, `/api/orders`).

## Deployment

This project deploys to [Cloudflare Workers](https://workers.cloudflare.com/).

1. Build the project:

```bash
npm run build
```

2. Deploy with Wrangler:

```bash
npx wrangler deploy
```

Set `SUPABASE_URL` and `SUPABASE_KEY` as secrets in your Cloudflare dashboard or via `npx wrangler secret put`.

## CI

GitHub Actions runs lint + build on every push and PR to `master`. Configure `SUPABASE_URL` and `SUPABASE_KEY` as repository secrets in GitHub for the build step.

## License

MIT
