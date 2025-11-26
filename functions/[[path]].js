// Cloudflare Pages Function to handle SPA routing
export async function onRequest(context) {
    const url = new URL(context.request.url);

    // If the path doesn't have a file extension, serve index.html
    if (!url.pathname.includes('.')) {
        return context.env.ASSETS.fetch(new URL('/index.html', url.origin));
    }

    // Otherwise, serve the requested asset
    return context.env.ASSETS.fetch(context.request);
}
