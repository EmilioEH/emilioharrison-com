import type { Recipe } from '../../lib/types'

export const generateGroceryList = async (recipes: Recipe[]): Promise<string> => {
  if (!recipes || recipes.length === 0) return '# Grocery List\n\nNo recipes selected.'

  try {
    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`

    const response = await fetch(`${baseUrl}api/generate-grocery-list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipes }),
    })

    if (!response.ok) {
      throw new Error('API request failed')
    }

    const data = await response.json()
    return data.text
  } catch (error) {
    console.error('Gemini API Error:', error)
    return (
      '# Offline Mode\n\nUnable to connect to AI service. Please try again later.\n\n' +
      recipes
        .map((r) => {
          const ingredients = r.ingredients || []
          const checkedList = ingredients.map((i) => `- [ ] ${i.amount} ${i.name}`).join('\n')
          return `## ${r.title}\n${checkedList}`
        })
        .join('\n\n')
    )
  }
}
