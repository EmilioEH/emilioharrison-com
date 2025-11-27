# emilioharrison.com

Personal website built with Astro, React, and Tailwind CSS.

## Tech Stack
- **Astro**: Static site generator with React islands for interactivity
- **React**: Component library for interactive elements
- **Tailwind CSS**: Utility-first CSS framework
- **Nano Stores**: State management for theme switching across React islands

## Development
```bash
npm install
npm run dev      # Start dev server at http://localhost:4321
npm run build    # Build for production
npm run preview  # Preview production build locally
npm test         # Run unit tests
```

## Deployment Workflow
This project is deployed to **emilioharrison.com** via GitHub → Cloudflare Pages:

1. **Push to GitHub**: Commit and push changes to the main branch
   ```bash
   git add .
   git commit -m "Your message"
   git push
   ```

2. **Cloudflare Pages**: Automatically detects the push and triggers a build
   - Build command: `npm run build`
   - Build output directory: `dist`

3. **Live Site**: Changes are deployed to https://emilioharrison.com within a few minutes

## Project Structure
```
src/
├── pages/           # Astro pages (file-based routing)
├── layouts/         # Global layouts
├── components/      # React components (hydrated as islands)
├── experiments/     # Interactive lab experiments
├── content/         # Markdown blog posts
└── lib/            # Utilities and stores
```
