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
    adapter: cloudflare(),
    integrations: [
        react(),
        tailwind(),
        keystatic(),
        markdoc()
    ],
    vite: {
        resolve: {
            alias: {
                "react-dom/server": "react-dom/server.edge"
            }
        }
    }
});
