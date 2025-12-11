import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';
import markdoc from '@astrojs/markdoc';


// https://astro.build/config
export default defineConfig({
    output: 'server',
    site: 'https://emilioharrison.com',
    adapter: cloudflare({
        platformProxy: {
            enabled: true
        }
    }),
    vite: {
        plugins: [
            {
                name: "polyfill-message-channel",
                enforce: "pre",
                transform(code, id) {
                    if (id.includes("entry.mjs") || id.includes("entry.js")) {
                        return {
                            code: `import { MessageChannel } from 'node:worker_threads';
if (!globalThis.MessageChannel) {
    globalThis.MessageChannel = MessageChannel;
}
${code}`,
                            map: null,
                        };
                    }
                },
            },
        ]
    },
    integrations: [
        react(),
        tailwind(),
        keystatic(),
        markdoc()
    ],

});
