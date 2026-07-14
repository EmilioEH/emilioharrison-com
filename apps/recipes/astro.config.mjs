import { defineConfig } from 'astro/config'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import cloudflare from '@astrojs/cloudflare'
import markdoc from '@astrojs/markdoc'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { visualizer } from 'rollup-plugin-visualizer'

// Bundle analysis: `npm run analyze` sets ANALYZE=true and produces a treemap report
// at dist/protected/recipes/stats.html. Gated behind the env var so normal builds are
// unaffected. Astro runs the vite pipeline once for the client bundle and once for the
// SSR/server bundle; `apply` restricts the report to the client build, since that's
// where the code-split entry chunk we care about lives.
const isAnalyze = process.env.ANALYZE === 'true'

// Service-worker cache versioning (see PERFORMANCE-PLAN.md P4): `public/sw.js` is a static
// file Astro copies verbatim, so it can't reference `import.meta.env` the way bundled code
// can. This integration stamps the placeholder `__SW_CACHE_VERSION__` (see public/sw.js)
// with a real value after the build copies it into dist/, so each deploy gets its own cache
// namespace and the SW's `activate` handler evicts the previous deploy's cached assets.
// Prefers Cloudflare Pages' own commit SHA (stable across identical redeploys, changes on
// every real deploy); falls back to a build timestamp locally/other CI so the placeholder
// is never shipped un-replaced.
function swCacheVersioning() {
  return {
    name: 'sw-cache-versioning',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const swPath = fileURLToPath(new URL('./sw.js', dir))
        const version = process.env.CF_PAGES_COMMIT_SHA || `local-${Date.now()}`
        try {
          const contents = await readFile(swPath, 'utf-8')
          await writeFile(swPath, contents.replaceAll('__SW_CACHE_VERSION__', version), 'utf-8')
          logger.info(`[sw-cache-versioning] Stamped sw.js with cache version "${version}"`)
        } catch (err) {
          logger.warn(`[sw-cache-versioning] Could not version sw.js: ${err}`)
        }
      },
    },
  }
}

// https://astro.build/config
// Force restart: 2
export default defineConfig({
  output: 'server',
  site: 'https://emilioharrison.com',
  base: '/protected/recipes',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  vite: {
    plugins: [
      //       nodePolyfills({
      //         include: ['buffer', 'process', 'stream'],
      //         globals: {
      //           Buffer: true,
      //           process: true,
      //         },
      //       }),
      ...(isAnalyze
        ? [
            {
              ...visualizer({
                filename: 'dist/protected/recipes/stats.html',
                gzipSize: true,
                brotliSize: true,
                template: 'treemap',
              }),
              apply: (_config, env) => !env.isSsrBuild,
            },
          ]
        : []),
    ],
    build: {
      rollupOptions: {
        output: {
          banner: `
if (!globalThis.MessageChannel) {
  class MessagePort {
    constructor(otherPort) {
      this.otherPort = otherPort;
      this.onmessage = null;
    }
    postMessage(message) {
      if (this.otherPort && this.otherPort.onmessage) {
        setTimeout(() => {
           this.otherPort.onmessage({ data: message });
        }, 0);
      }
    }
  }
  
  class MessageChannel {
    constructor() {
      this.port1 = new MessagePort();
      this.port2 = new MessagePort();
      this.port1.otherPort = this.port2;
      this.port2.otherPort = this.port1;
    }
  }
  globalThis.MessageChannel = MessageChannel;
}`,
        },
      },
    },
  },
  devToolbar: {
    enabled: true,
  },
  integrations: [react(), tailwind(), markdoc(), swCacheVersioning()],
})
