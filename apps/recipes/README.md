# Chefboard: The AI-Powered Recipe Manager

Chefboard is a intelligent recipe management system built for speed, utility, and seamless user experiences. It leverages AI to handle the tedious parts of cooking—like parsing messy web contents into structured data and generating organized grocery lists.

> [!NOTE]
> This application is living inside the `apps/recipes` directory as part of a monorepo and is deployed to `/protected/recipes`.

## 🚀 Core Features

- **PWA Experience**: Installable on mobile with offline support.
- **Advanced Management**: Edit recipes, track version history, and rate/favorite your best dishes.
- **Data Control**: Export/Import your data and manage bulk deletions.
- **AI Recipe Parsing**: Paste any recipe text or URL, and our Gemini-powered engine extracts ingredients, instructions, and metadata automatically.
- **Smart Grocery Lists**: Generate categorized grocery lists from your saved recipes with a single click.
- **Shared Family Collection**: All recipes are stored in Cloudflare D1 (SQL) and shared across all authenticated users. Perfect for families or groups collaborating on a recipe collection.
- **Privacy First**: Secure, protected dashboard accessible only to authenticated users.
- **Weekly Meal Planning**: Tag recipes for "This Week" to organize your cooking schedule. The system intelligently warns you if you're selecting too many recipes with the same protein to ensure variety.
- **Hybrid AI Grocery Generator**: Combine recipes into a consolidated, categorized shopping list. Uses AI to parse messy ingredients and deterministic logic to merge quantities and organize by aisle.
- **Interactive Shopping Mode**: Check off items as you shop, copy to clipboard, or share via native sheet. Optimizes your trip by grouping items (Produce, Dairy, etc.).
- **Install as App**: Add Chefboard to your home screen on iOS and Android for a native app experience with custom icon and name.
- **Recipe Cooking Mode**: A dedicated, focused view for cooking with pre-cooking checklists, step-by-step guidance, and post-cooking feedback (ratings and notes).
- **Feedback System**: Directly submit bug reports and enhancement ideas from any screen via the persistent global feedback button. Captured reports include screenshots (saved to R2), console logs, and application state to help developers/agents solve issues faster.

## 🛠 Tech Stack

- **Framework**: [Astro 5](https://astro.build/) (Islands Architecture for performance)
- **UI Architecture**: React + [TailwindCSS](https://tailwindcss.com/)
- **State Management**: [Nanostores](https://github.com/nanostores/nanostores) (Lightweight & Framework-agnostic)
- **Serverless**: [Cloudflare Pages](https://pages.cloudflare.com/) + [D1](https://developers.cloudflare.com/d1/) (SQL) + [R2](https://developers.cloudflare.com/r2/) (Images) + [KV](https://developers.cloudflare.com/kv/) (Sessions)
- **Content**: [Markdoc](https://markdoc.dev/) + Markdown
- **AI Standards**:
  - [Gemini API Guide](file:///Users/emilioharrison/Desktop/emilioharrison-com/apps/recipes/docs/technical/gemini-api-guide.md)
  - [Deployment Guide](file:///Users/emilioharrison/Code/emilioharrison-com/apps/recipes/docs/technical/deployment.md)
  - [Recipe Data Schema](file:///Users/emilioharrison/Desktop/emilioharrison-com/.agent/knowledge/recipe-schema.md)
  - [Grocery Logic Standards](file:///Users/emilioharrison/Desktop/emilioharrison-com/.agent/knowledge/grocery-logic.md)
  - [Sync & Persistence Standards](file:///Users/emilioharrison/Desktop/emilioharrison-com/.agent/knowledge/sync-standards.md)

## 🚦 The Quality Gate

We maintain high code health through a mandatory protocol. Before contributing or committing, ensure these checks pass:

### Safety Checks

```bash
npm run check:safety
# Runs: Linting, Type Checking (TSC + Astro), and Formatting
```

### Hygiene Checks

```bash
npm run check:hygiene
# Runs: Knip (dead code), Depcheck (unused deps), and Jscpd (duplicates)
```

### Testing & Validation

```bash
npm run test:unit
# Runs: Vitest unit tests
```

```bash
npm run test:e2e
# Runs: Playwright E2E tests to verify the core user journey
```

### Processing Feedback (Holodeck)

We utilize an "Agent-Ready" feedback system that captures deep technical context to help Coding Agents diagnose issues without needing to reproduce them blindly.

To sync reports from the live environment:

```bash
npx tsx scripts/sync-feedback.ts
```

Synced reports are saved to `docs/feedback/active-reports.md` and include:

- **📸 Auto-Screenshots**: Automatically captured via `html2canvas` (ignoring the modal itself).
- **📝 Real Console Logs**: A ring buffer of the last 100 console events (Log, Warn, Error).
- **🏗 DOM Snapshot**: The full HTML structure of the page at the moment of the report.
- **📱 Device Metadata**: Window size, User Agent, and App State.

## 💻 Getting Started

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Environment Setup**:
   Copy `.env.local.example` to `.env.local` and add your `GEMINI_API_KEY`.

   > **Production Note**: For the live site, the `GEMINI_API_KEY` is configured in **Cloudflare Pages Environment Variables**.

3. **Development**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:4321/protected/recipes`.

## 🚀 Production Deployment

This application is deployed to Cloudflare Pages and requires proper configuration of bindings for production.

### Required Cloudflare Bindings

The following bindings must be configured in the **Cloudflare Pages Dashboard** for production:

1. **D1 Database Binding**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **emilioharrison-com**
   - Navigate to **Settings** → **Functions** → **D1 database bindings**
   - Add binding:
     - **Variable name**: `DB`
     - **D1 database**: `recipes-db`

2. **R2 Bucket Binding** (for recipe images and feedback screenshots):
   - In **Settings** → **Functions** → **R2 bucket bindings**
   - Add binding:
     - **Variable name**: `BUCKET`
     - **R2 bucket**: `recipes-images`

3. **KV Namespace Binding** (for sessions):
   - In **Settings** → **Functions** → **KV namespace bindings**
   - Add binding:
     - **Variable name**: `SESSION`
     - **KV namespace**: Select your session namespace

> [!IMPORTANT]
> After adding or modifying bindings, you **must trigger a new deployment** for changes to take effect. Either:
>
> - Push a new commit to trigger automatic deployment
> - Or use the dashboard: **Deployments** → **Retry deployment**

> [!NOTE]
> The `wrangler.toml` file configures bindings for **local development only**. Production bindings must be configured through the Cloudflare dashboard.

## 📂 Project Structure

- `src/components/`: React islands for interactive features.
- `src/pages/api/`: Serverless functions for parsing, grocery generation, and data syncing.
- `src/lib/`: Shared utilities, stores, and API clients.
- `tests/`: End-to-end user journey tests.

---

Built with ❤️ by Emilio.
