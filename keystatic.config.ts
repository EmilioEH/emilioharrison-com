import { config, fields, collection } from '@keystatic/core';

export default config({
    storage: import.meta.env.PROD
        ? {
            kind: 'github',
            repo: 'EmilioEH/emilioharrison-com',
        }
        : {
            kind: 'local',
        },
    collections: {
        posts: collection({
            label: 'Posts',
            slugField: 'title',
            path: 'src/content/posts/*',
            format: { contentField: 'content' },
            schema: {
                title: fields.slug({ name: { label: 'Title' } }),
                status: fields.select({
                    label: 'Status',
                    options: [
                        { label: 'Draft', value: 'draft' },
                        { label: 'Scheduled', value: 'scheduled' },
                        { label: 'Published', value: 'published' },
                    ],
                    defaultValue: 'draft',
                }),
                featured: fields.checkbox({
                    label: 'Featured',
                    description: 'Check to feature this post on the homepage',
                }),
                publishedDate: fields.datetime({
                    label: 'Published Date',
                    description: 'For scheduled posts, set this to the future date you want it to go live.',
                }),
                date: fields.text({
                    label: 'Display Date',
                    description: 'Format: MMM DD, YYYY (e.g. Nov 27, 2025)'
                }),
                category: fields.relationship({
                    label: 'Category',
                    collection: 'categories',
                }),
                tags: fields.array(
                    fields.relationship({
                        label: 'Tag',
                        collection: 'tags',
                    }),
                    {
                        label: 'Tags',
                        itemLabel: props => props.value || 'Tag',
                    }
                ),
                excerpt: fields.text({ label: 'Excerpt', multiline: true }),
                cover: fields.image({
                    label: 'Cover Image',
                    directory: 'src/assets/blogIMG',
                    publicPath: '../../assets/blogIMG/',
                }),
                coverAlt: fields.text({ label: 'Cover Image Alt Text' }),
                content: fields.document({
                    label: 'Content',
                    formatting: true,
                    dividers: true,
                    links: true,
                    images: {
                        directory: 'src/assets/blogIMG',
                        publicPath: '../../assets/blogIMG/',
                    },
                }),
            },
        }),
        tags: collection({
            label: 'Tags',
            slugField: 'name',
            path: 'src/content/tags/*',
            format: 'json',
            schema: {
                name: fields.slug({ name: { label: 'Name' } }),
            },
        }),
        categories: collection({
            label: 'Categories',
            slugField: 'name',
            path: 'src/content/categories/*',
            format: 'json',
            schema: {
                name: fields.slug({ name: { label: 'Name' } }),
            },
        }),
    },
});
