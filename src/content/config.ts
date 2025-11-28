import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
    type: 'content',
    schema: ({ image }) => z.object({
        title: z.string(),
        status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
        publishedDate: z.date().optional(),
        date: z.string(),
        category: z.string(),
        excerpt: z.string(),
        takeaways: z.array(z.object({
            title: z.string(),
            text: z.string(),
        })).optional(),
        cover: image().optional(),
        coverAlt: z.string().optional(),
    }),
});

export const collections = { posts };
