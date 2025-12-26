# Cloudflare Production Deployment Guide

This guide details the steps to deploy the Recipe App to Cloudflare Pages with D1 (Database) and R2 (Storage) bindings.

## Prerequisites

- Cloudflare Account
- `wrangler` CLI installed and authenticated (`npx wrangler login`)

## 1. Create Production Resources

You need to create the actual database and bucket in your Cloudflare account.

### D1 Database

Run the following command to create the database:

```bash
npx wrangler d1 create recipes-db
```

**Output:**
You will see output containing your `database_id`. **Copy this ID.**

```toml
[[d1_databases]]
binding = "DB"
database_name = "recipes-db"
database_id = "<UNIQUE_ID_FROM_OUTPUT>"
```

### R2 Bucket

Run the following command to create the storage bucket:

```bash
npx wrangler r2 bucket create recipes-images
```

## 2. Configure `wrangler.toml`

Update your `apps/recipes/wrangler.toml` file with the production `database_id` you just generated.

```toml
[[d1_databases]]
binding = "DB"
database_name = "recipes-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" # <--- Update this!

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "recipes-images"
```

> **Note:** If you are using Cloudflare Pages Git Integration (push to deploy), strictly speaking `wrangler.toml` bindings support is technically in beta or specific to "Pages Functions". Alternatively, you can configure these bindings in the **Cloudflare Dashboard > Pages > Your Project > Settings > Functions > D1 Database Bindings / R2 Bucket Bindings**.

## 3. Apply Schema to Production

Once the database exists and `wrangler.toml` is updated with the real ID, apply your schema to the remote database:

```bash
npx wrangler d1 execute DB --remote --file=schema.sql
```

## 4. Deploy

### Option A: Manual Deployment (CLI)

Build the application and deploy directly using Wrangler.

```bash
npm run build
npx wrangler pages deploy dist --project-name=chefboard
```

### Option B: Git Integration (Your Workflow)

Since you are deploying via GitHub, follow these specific steps to ensure the bindings work in a Monorepo context.

1.  **Configure Monorepo Settings**:
    - In Cloudflare Dashboard > Pages > Your Project > **Settings > Build & deployments**.
    - Ensure **Path to Root** (or "Root Directory") is set to: `apps/recipes`.
    - This ensures Cloudflare finds your `wrangler.toml`.

2.  **Manage Bindings**:
    - **Recommended**: Commit the `wrangler.toml` with the **production** `database_id` to your repository. Cloudflare Pages will auto-detect it.
    - **Alternative**: If you want to keep `wrangler.toml` generic or local-only, go to **Settings > Functions** in the Dashboard and manually add the D1 and R2 bindings there. Dashboard settings override `wrangler.toml`.

3.  **Critical: Manual Steps Still Required (CLI)**
    Git push **deploy** the code, but it **does not** create resources or migrate databases. You must still run these from your local terminal:
    - **Create DB**: `npx wrangler d1 create recipes-db` (One time)
    - **Create Bucket**: `npx wrangler r2 bucket create recipes-images` (One time)
    - **Update Schema**: `npx wrangler d1 execute DB --remote --file=schema.sql` (Every time you change schema)

    _Tip: You verify the connection by running `npx wrangler d1 info --remote`._

## 5. Verification

Visit your production URL.

- **Test D1**: The recipe list should load (initially empty).
- **Test R2**: Upload a recipe image and ensure it persists.
