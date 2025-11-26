import matter from 'gray-matter';
import { Buffer } from 'buffer';

// Polyfill Buffer for gray-matter in browser
if (typeof window !== 'undefined') {
    window.Buffer = Buffer;
}

// Load markdown files
const modules = import.meta.glob('../content/posts/*.md', { as: 'raw', eager: true });

export const BLOG_POSTS = Object.keys(modules).map((path, index) => {
    const { data, content } = matter(modules[path]);
    return {
        id: index + 1,
        ...data,
        content,
        slug: path.split('/').pop().replace('.md', '')
    };
}).sort((a, b) => new Date(b.date) - new Date(a.date));
