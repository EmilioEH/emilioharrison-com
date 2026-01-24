const originalRecipe = {
  id: '123',
  title: 'My Ramen',
  ingredients: [{ name: 'Noodles', amount: '1 lb' }],
  steps: ['Boil water', 'Cook noodles'],
  sourceUrl: 'http://example.com',
}

const badAiResult = {
  title: 'My Ramen', // AI usually keeps title
  description: 'A delicious ramen.',
  ingredients: [], // Empty because parsing failed
  steps: [], // Empty
  structuredSteps: [],
  ingredientGroups: [],
}

// ------------------------------------------------------------------
// SIMULATE THE FIX: "Safety Merge"
// ------------------------------------------------------------------
console.log('\n--- Simulating "Safety Merge" Logic ---')

const updatedRecipe = {
  ...originalRecipe,
  // ...badAiResult, // NO! We don't blind spread anymore

  updatedAt: new Date().toISOString(),
  // Manual protections
  sourceUrl: originalRecipe.sourceUrl || badAiResult.sourceUrl,
  sourceImage: originalRecipe.sourceImage || badAiResult.sourceImage,
  images: originalRecipe.images || badAiResult.images,
}

// SAFETY MERGE: Do not overwrite existing ingredients/steps with empty arrays
if (badAiResult.ingredients && badAiResult.ingredients.length > 0) {
  updatedRecipe.ingredients = badAiResult.ingredients
} else {
  console.log('[Enhance] AI returned empty ingredients. Keeping original.')
  updatedRecipe.ingredients = originalRecipe.ingredients
}

if (badAiResult.steps && badAiResult.steps.length > 0) {
  updatedRecipe.steps = badAiResult.steps
} else {
  console.log('[Enhance] AI returned empty steps. Keeping original.')
  updatedRecipe.steps = originalRecipe.steps
}

// ------------------------------------------------------------------
// VALIDATE
// ------------------------------------------------------------------
console.log('\nOriginal Ingredients:', originalRecipe.ingredients.length)
console.log('Updated Ingredients:', updatedRecipe.ingredients.length)

if (updatedRecipe.ingredients.length === 0 && originalRecipe.ingredients.length > 0) {
  console.log('FAIL: Original ingredients were wiped out!')
  process.exit(1)
} else if (updatedRecipe.ingredients.length === originalRecipe.ingredients.length) {
  console.log('PASS: Ingredients preserved!')
  process.exit(0)
} else {
  console.log('WARN: Something else happened.')
  process.exit(0)
}
