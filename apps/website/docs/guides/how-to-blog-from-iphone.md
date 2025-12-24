# How to Blog from Your iPhone (The Easy Way)

You now have **Keystatic** installed! This gives you a beautiful, mobile-friendly admin panel to write posts without touching code.

## 🚀 The New Workflow

1.  **Open the Admin Panel**: Go to `your-site.com/keystatic` on your iPhone.
2.  **Tap "Posts"**: You'll see a list of all your existing articles.
3.  **Tap "Create"**:
    - **Title**: Enter your post title.
    - **Date**: Type the date (e.g., "Nov 27, 2025").
    - **Category**: Enter a category (e.g., "General").
    - **Excerpt**: Write a short summary.
    - **Takeaways**: Add your key points (optional).
    - **Cover Image**: Tap to upload an image directly from your Photo Library.
    - **Content**: Write your post! You can add bold text, links, and images easily.
4.  **Tap "Create" (or "Save")**: This will automatically commit the new post to your GitHub repository and trigger a deploy.

---

## ⚠️ One-Time Setup Required

To make this work on your live site (and not just on your computer), you need to connect Keystatic to GitHub.

### Step 1: Create a GitHub App

1.  Go to [GitHub Settings > Developer Settings > GitHub Apps](https://github.com/settings/apps).
2.  Click **"New GitHub App"**.
3.  **GitHub App Name**: `Emilio's Blog CMS` (or similar).
4.  **Homepage URL**: `https://emilioharrison.com`
5.  **Callback URL**: `https://emilioharrison.com/keystatic/oauth/callback` (IMPORTANT: This must be exact).
6.  **Webhook URL**: Uncheck "Active" (not needed).
7.  **Permissions**:
    - **Contents**: `Read & Write`
    - **Metadata**: `Read-only`
8.  Click **"Create GitHub App"**.

### Step 2: Get Your Credentials

After creating the app, you will see a `Client ID` and a button to generate a `Client Secret`.

1.  Copy the **Client ID**.
2.  Generate and copy the **Client Secret**.

### Step 3: Add Environment Variables to Cloudflare

You need to tell your site these secrets.

1.  Log in to your Cloudflare Dashboard.
2.  Go to **Pages** > **emilioharrison-com** > **Settings** > **Environment Variables**.
3.  Add the following variables:
    - `KEYSTATIC_GITHUB_CLIENT_ID`: (Paste your Client ID)
    - `KEYSTATIC_GITHUB_CLIENT_SECRET`: (Paste your Client Secret)
    - `KEYSTATIC_SECRET`: (Generate a random long string, e.g., using `openssl rand -base64 32` or a password generator)

### Step 4: Install the App

1.  Back on your GitHub App page, click **"Install App"** on the left sidebar.
2.  Click **"Install"** next to your account (`EmilioEH`).
3.  Select **"Only select repositories"** and choose `emilioharrison-com`.
4.  Click **"Install"**.

---

## Troubleshooting

- **"Local Mode"**: If you run `npm run dev` on your computer, Keystatic runs in "Local Mode" and saves files directly to your disk. No login required.
- **Images**: Keystatic automatically handles image uploads and places them in `src/assets/blogIMG`. You don't need to worry about paths anymore!
