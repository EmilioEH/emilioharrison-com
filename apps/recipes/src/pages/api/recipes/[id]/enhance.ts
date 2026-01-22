import type { APIRoute } from 'astro'
import { Type as SchemaType } from '@google/genai'
import { initGeminiClient, serverErrorResponse } from '../../../../lib/api-helpers'
import { db } from '../../../../lib/firebase-server'
import type { Recipe, IngredientGroup, StructuredStep, Ingredient } from '../../../../lib/types'

// Comprehensive enhancement rules (matching parse-recipe.ts full enhanced mode)
const INGREDIENT_PARSING_RULES = `
**INGREDIENT PARSING & FORMATTING (ENHANCED MODE)**:
- **Dual Measurements**: ALWAYS provide volume (cups/tbsp) AND mass (grams/ounces) for dry goods and produce.
  - Ex: "1 cup flour" -> amount: "5 oz (140g)", name: "all-purpose flour"
  - Ex: "1 onion" -> amount: "1 medium", name: "yellow onion", prep: "finely diced (about 1.5 cups)"
- **State & Prep**: Define the PHYSICAL STATE of the ingredient BEFORE it enters the pan.
  - Ex: "Butter" -> name: "unsalted butter", prep: "cut into 1/2-inch cubes and kept chilled"
- **Specificity**: Infer specific varieties contextually.
  - Ex: "Oil" -> name: "neutral oil", prep: "such as canola, grapeseed, or peanut"
- **Divided Uses**: If used multiple times (e.g. sauce and pasta water), append ", divided" to the name/prep.
`

const INGREDIENT_GROUPING_RULES = `
**INGREDIENT GROUPING (ENHANCED MODE)**:
- **Mise-en-Place Flow**: Organize by chronology of use and component grouping.
- **Logical Sub-Headers**: Group by component (e.g., "FOR THE DUXELLES", "FOR THE BEEF", "FOR THE ASSEMBLY").
- **Chronological Ordering**: Ingredients listed in exact order they go into the pot.
- **"Plus More" Syntax**: If used for main task and finishing, use modifier so it doesn't appear twice.
  - Format: "1/2 cup parsley, minced, plus more for garnish"
- **Strict Mapping**: Every ingredient must belong to a group.
- **Populate**: 'ingredientGroups' with startIndex and endIndex for each group.
`

const STRUCTURED_STEPS_RULES = `
**STRUCTURED STEPS (ENHANCED MODE - MACRO-STEPS)**:
- **Macro-Step Architecture**: Group instructions into "Macro-Steps" based on phases of cooking (not individual actions).
  - Aim for 4-6 dense paragraphs total.
  - Phase 1: Prep/Sear (High heat)
  - Phase 2: Aromatics/Deglaze
  - Phase 3: Braise/Simmer
  - Phase 4: Finish/Texture
- **The "Until" Framework**: Every step involving heat MUST define a sensory endpoint using "until".
  - Input: "Cook for 10 minutes."
  - Output: "Cook, stirring frequently, until deep golden brown and reduced by half, about 10 minutes."
- **Heat Management Descriptors**: Use descriptive physics terms (shimmering, foaming subsides, bare simmer).
- **Troubleshooting Parentheticals**: Insert safety nets in parentheses for common failure points.
  - Ex: "(If the garlic begins to darken too quickly, remove from heat to prevent bitterness.)"
- **Scientific "Why"**: Occasionally explain the purpose of a technique (e.g., "...whisking vigorously to emulsify the fat").
- **Parallel Processing**: Organize steps to utilize downtime (e.g., "While the potatoes boil, heat the butter...").
- **The "Reserve" Pattern**: Explicitly manage flow (Cook meat -> Remove and Reserve -> Cook Veg -> Return meat).
- **Data Structure**:
  - title: Action-focused header (e.g., "Sear the Beef")
  - text: The full macro-step paragraph.
  - highlightedText: The text with key verbs in **bold**.
  - tip: Key troubleshooting or scientific note extracted.
  - substeps: Break down the macro-step into atomic actions.
- Populate 'structuredSteps' array with these objects.
`

const STEP_GROUPING_RULES = `
**STEP GROUPING (REQUIRED)**:
- **Match Ingredients**: Organize steps into logical phases that MATCH the ingredient groups.
- **Chronological**: The step groups should mirror the ingredient groups chronologically.
- **Headers**: Use SHORT, ALL-CAPS headers (2-4 words max) that describe the ACTION.
- **Populate**: 'stepGroups' with header, startIndex, and endIndex.
`

const ENHANCE_SYSTEM_PROMPT = `
You are an expert Chef and Recipe Developer analyzing a recipe to enhance its structure with professional-grade formatting.

Given the recipe's title, ingredients, and steps, generate enhanced structured data following these comprehensive rules:

${INGREDIENT_PARSING_RULES}
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
${STEP_GROUPING_RULES}

Return JSON matching the schema.
`

const responseSchema = {
  type: SchemaType.OBJECT as const,
  properties: {
    ingredientGroups: {
      type: SchemaType.ARRAY as const,
      items: {
        type: SchemaType.OBJECT as const,
        properties: {
          header: { type: SchemaType.STRING as const },
          startIndex: { type: SchemaType.NUMBER as const },
          endIndex: { type: SchemaType.NUMBER as const },
        },
        required: ['header', 'startIndex', 'endIndex'] as const,
      },
    },
    structuredSteps: {
      type: SchemaType.ARRAY as const,
      items: {
        type: SchemaType.OBJECT as const,
        properties: {
          title: { type: SchemaType.STRING as const, nullable: true },
          text: { type: SchemaType.STRING as const },
          highlightedText: { type: SchemaType.STRING as const },
          tip: { type: SchemaType.STRING as const, nullable: true },
          substeps: {
            type: SchemaType.ARRAY as const,
            items: {
              type: SchemaType.OBJECT as const,
              properties: {
                text: { type: SchemaType.STRING as const },
                action: { type: SchemaType.STRING as const },
                targets: {
                  type: SchemaType.ARRAY as const,
                  items: { type: SchemaType.STRING as const },
                },
              },
              required: ['text', 'action'] as const,
            },
          },
        },
        required: ['text', 'highlightedText'] as const,
      },
    },
    stepGroups: {
      type: SchemaType.ARRAY as const,
      items: {
        type: SchemaType.OBJECT as const,
        properties: {
          header: { type: SchemaType.STRING as const },
          startIndex: { type: SchemaType.NUMBER as const },
          endIndex: { type: SchemaType.NUMBER as const },
        },
        required: ['header', 'startIndex', 'endIndex'] as const,
      },
    },
  },
  required: ['ingredientGroups', 'structuredSteps', 'stepGroups'] as const,
}

export const POST: APIRoute = async ({ params, locals }) => {
  const recipeId = params.id

  if (!recipeId) {
    return new Response(JSON.stringify({ error: 'Recipe ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let client
  try {
    client = await initGeminiClient(locals)
  } catch {
    return serverErrorResponse('Missing API Key configuration')
  }

  try {
    // Fetch the recipe from Firestore using the shared db proxy
    const recipe = (await db.getDocument('recipes', recipeId)) as Recipe | null

    if (!recipe) {
      return new Response(JSON.stringify({ error: 'Recipe not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // If already enhanced, return existing data
    if (recipe.ingredientGroups?.length && recipe.structuredSteps?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ingredientGroups: recipe.ingredientGroups,
            structuredSteps: recipe.structuredSteps,
          },
          cached: true,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Build prompt with recipe data
    const ingredientsList = recipe.ingredients
      .map((ing: Ingredient, idx: number) =>
        `${idx}: ${ing.amount || ''} ${ing.name}${ing.prep ? ` (${ing.prep})` : ''}`.trim(),
      )
      .join('\n')

    const stepsList = recipe.steps
      .map((step: string, idx: number) => `Step ${idx + 1}: ${step}`)
      .join('\n')

    const prompt = `Recipe: ${recipe.title}

INGREDIENTS (with 0-based indices):
${ingredientsList}

STEPS:
${stepsList}

Generate ingredientGroups (using startIndex/endIndex to reference ingredients) and structuredSteps.`

    // Call Gemini
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: 'application/json',
        responseSchema,
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: ENHANCE_SYSTEM_PROMPT }, { text: prompt }],
        },
      ],
    })

    const resultText = response.text
    if (!resultText) {
      throw new Error('No content generated by Gemini')
    }

    const enhancedData = JSON.parse(resultText) as {
      ingredientGroups: IngredientGroup[]
      structuredSteps: StructuredStep[]
      stepGroups?: Array<{ header: string; startIndex: number; endIndex: number }>
    }

    // Save to Firestore for caching
    await db.updateDocument('recipes', recipeId, {
      ingredientGroups: enhancedData.ingredientGroups,
      structuredSteps: enhancedData.structuredSteps,
      stepGroups: enhancedData.stepGroups || [],
      updatedAt: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: enhancedData,
        cached: false,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error: unknown) {
    console.error('Enhance Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to enhance recipe'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
