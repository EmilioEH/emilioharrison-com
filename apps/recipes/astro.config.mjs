import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import cloudflare from '@astrojs/cloudflare'
import markdoc from '@astrojs/markdoc'

// https://astro.build/config
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
    plugins: [],
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
    enabled: false,
  },
  integrations: [react(), tailwind(), markdoc()],
})
