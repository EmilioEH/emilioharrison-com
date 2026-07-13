import { defineConfig } from 'astro/config'
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
  integrations: [react(), tailwind(), markdoc()],
})
