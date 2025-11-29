import Fuse from 'fuse.js';

/**
 * Fuzzy search posts using Fuse.js
 * @param {Array} posts - Array of post objects
 * @param {string} query - Search query
 * @returns {Array} - Filtered array of posts
 */
export const fuzzySearch = (posts, query) => {
    if (!query) return posts;

    const fuse = new Fuse(posts, {
        keys: [
            { name: 'data.title', weight: 1.0 },
            { name: 'data.excerpt', weight: 0.6 },
            { name: 'data.takeaways.text', weight: 0.4 }
        ],
        threshold: 0.4, // Sensitivity: 0.0 is exact match, 1.0 is match anything
        includeScore: true
    });

    return fuse.search(query).map(result => result.item);
};

/**
 * Filter posts by selected tags (OR logic)
 * @param {Array} posts - Array of post objects
 * @param {Array} selectedTags - Array of selected tag strings
 * @returns {Array} - Filtered array of posts
 */
export const filterByTags = (posts, selectedTags) => {
    if (!selectedTags || selectedTags.length === 0) return posts;

    return posts.filter(post => {
        const postTags = post.data.tags || [];
        return selectedTags.some(tag => postTags.includes(tag));
    });
};

/**
 * Filter posts by selected categories (OR logic)
 * @param {Array} posts - Array of post objects
 * @param {Array} selectedCategories - Array of selected category strings
 * @returns {Array} - Filtered array of posts
 */
export const filterByCategories = (posts, selectedCategories) => {
    if (!selectedCategories || selectedCategories.length === 0) return posts;

    return posts.filter(post => {
        return selectedCategories.includes(post.data.category);
    });
};

/**
 * Sort posts by date
 * @param {Array} posts - Array of post objects
 * @param {string} sortOrder - 'newest' or 'oldest'
 * @returns {Array} - Sorted array of posts
 */
export const sortPosts = (posts, sortOrder = 'newest') => {
    return [...posts].sort((a, b) => {
        const dateA = new Date(a.data.date).getTime();
        const dateB = new Date(b.data.date).getTime();

        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
};

/**
 * Apply all filters and sort
 * @param {Array} posts - Initial array of posts
 * @param {Object} filters - Filter state object
 * @returns {Array} - Final filtered and sorted posts
 */
export const applyAllFilters = (posts, { search, tags, categories, sort }) => {
    let result = posts;

    // 1. Search (most restrictive)
    if (search) {
        result = fuzzySearch(result, search);
    }

    // 2. Tags
    if (tags && tags.length > 0) {
        result = filterByTags(result, tags);
    }

    // 3. Categories
    if (categories && categories.length > 0) {
        result = filterByCategories(result, categories);
    }

    // 4. Sort
    result = sortPosts(result, sort);

    return result;
};
