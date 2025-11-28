import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';
import markdoc from '@astrojs/markdoc';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
    site: 'https://emilioharrison.com',
    adapter: cloudflare(),
    integrations: [
        react(),
        tailwind(),
        sitemap(),
        // keystatic(),
        markdoc()
    ]
});
