import { defineMiddleware } from 'astro:middleware'

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, url, redirect } = context

  // Check if the user is trying to access the protected route
  // Exclude login page to avoid redirect loops and allow form submission
  if (url.pathname.startsWith('/protected') && !url.pathname.includes('/login')) {
    const authCookie = cookies.get('site_auth')
    const userCookie = cookies.get('site_user')

    // If no cookie or cookie value is wrong, OR if user name is missing, redirect to login
    if (!authCookie || authCookie.value !== 'true' || !userCookie || !userCookie.value) {
      return redirect('/protected/recipes/login')
    }
  }

  return next()
})
