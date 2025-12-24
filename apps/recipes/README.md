# Chefboard: The AI-Powered Recipe Manager

Chefboard is a intelligent recipe management system built for speed, utility, and seamless user experiences. It leverages AI to handle the tedious parts of cooking—like parsing messy web contents into structured data and generating organized grocery lists.

> [!NOTE]
> This application is living inside the `apps/recipes` directory as part of a monorepo and is deployed to `/protected/recipes`.

## 🚀 Core Features

- **AI Recipe Parsing**: Paste any recipe text or URL, and our Gemini-powered engine extracts ingredients, instructions, and metadata automatically.
- **Smart Grocery Lists**: Generate categorized grocery lists from your saved recipes with a single click.
- **Persistence & Sync**: Your data is securely stored in Cloudflare KV, synced across your devices via your `site_user` identity.
- **Privacy First**: Secure, protected dashboard accessible only to authenticated users.

## 🛠 Tech Stack

- **Framework**: [Astro 5](https://astro.build/) (Islands Architecture for performance)
- **UI Architecture**: React + [TailwindCSS](https://tailwindcss.com/)
- **State Management**: [Nanostores](https://github.com/nanostores/nanostores) (Lightweight & Framework-agnostic)
- **Serverless**: [Cloudflare Pages](https://pages.cloudflare.com/) + [KV](https://www.cloudflare.com/products/workers-kv/)
- **CMS**: [Keystatic](https://keystatic.com/) for structured content

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

### User Journey Validation

```bash
npm run test:e2e
# Runs: Playwright E2E tests to verify the core user journey
```

## 💻 Getting Started

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Environment Setup**:
   Copy `.env.local.example` to `.env.local` and add your `GEMINI_API_KEY`.

3. **Development**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:4321/protected/recipes`.

## 📂 Project Structure

- `src/components/`: React islands for interactive features.
- `src/pages/api/`: Serverless functions for parsing, grocery generation, and data syncing.
- `src/lib/`: Shared utilities, stores, and API clients.
- `tests/`: End-to-end user journey tests.

---

Built with ❤️ by Emilio.
