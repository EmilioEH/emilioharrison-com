import { defineMiddleware } from 'astro:middleware'

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, url, redirect } = context

  // Check if the user is trying to access the protected route
  if (url.pathname.startsWith('/protected')) {
    const authCookie = cookies.get('site_auth')
    const userCookie = cookies.get('site_user')

    // If no cookie or cookie value is wrong, OR if user name is missing, redirect to login
    if (!authCookie || authCookie.value !== 'true' || !userCookie || !userCookie.value) {
      return redirect('/login')
    }
  }

  return next()
})
