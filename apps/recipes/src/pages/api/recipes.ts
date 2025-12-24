import type { APIContext } from 'astro'

export const GET = async ({ locals }: APIContext) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { SESSION } = (locals as any).runtime.env
    const data = await SESSION.get('RECIPE_DATA')

    // Parse if data exists, otherwise return empty array
    const recipes = data ? JSON.parse(data) : []

    return new Response(JSON.stringify(recipes), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('API GET Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch recipes' }), { status: 500 })
  }
}

export const POST = async ({ request, locals }: APIContext) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { SESSION } = (locals as any).runtime.env
    const body = await request.json()

    // Validate body is array
    if (!Array.isArray(body)) {
      return new Response('Invalid data format', { status: 400 })
    }

    await SESSION.put('RECIPE_DATA', JSON.stringify(body))

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('API POST Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to save recipes' }), { status: 500 })
  }
}
