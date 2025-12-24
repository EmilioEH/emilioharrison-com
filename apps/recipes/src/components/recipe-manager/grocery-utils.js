export const generateGroceryList = async (recipes) => {
  if (!recipes || recipes.length === 0) return '# Grocery List\n\nNo recipes selected.'

  try {
    const response = await fetch('/api/generate-grocery-list', {
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
          const checkedList = r.ingredients.map((i) => `- [ ] ${i.amount} ${i.name}`).join('\n')
          return `## ${r.title}\n${checkedList}`
        })
        .join('\n\n')
    )
  }
}
