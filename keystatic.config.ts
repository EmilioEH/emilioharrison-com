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
                date: fields.text({
                    label: 'Date',
                    description: 'Format: MMM DD, YYYY (e.g. Nov 27, 2025)'
                }),
                category: fields.text({ label: 'Category' }),
                excerpt: fields.text({ label: 'Excerpt', multiline: true }),
                takeaways: fields.array(
                    fields.object({
                        title: fields.text({ label: 'Takeaway Title' }),
                        text: fields.text({ label: 'Takeaway Text', multiline: true }),
                    }),
                    {
                        label: 'Takeaways',
                        itemLabel: props => props.fields.title.value || 'Takeaway',
                    }
                ),
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
    },
});
