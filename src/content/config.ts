import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
    type: 'content',
    schema: ({ image }) => z.object({
        title: z.string(),
        status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
        publishedDate: z.date().optional(),
        date: z.string(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        excerpt: z.string(),
        cover: image().optional(),
        coverAlt: z.string().optional(),
    }),
});

const tags = defineCollection({
    type: 'data',
    schema: z.object({
        name: z.string(),
    }),
});

const categories = defineCollection({
    type: 'data',
    schema: z.object({
        name: z.string(),
    }),
});

export const collections = { posts, tags, categories };
