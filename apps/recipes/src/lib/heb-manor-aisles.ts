/**
 * H-E-B Manor (Store #811) aisle mapping for grocery list organization.
 * Categories ordered by optimal walking path through the store.
 */

/**
 * 19 categories in H-E-B Manor walking-path order.
 * Perimeter departments first, then interior aisles front-to-back.
 */
export const HEB_CATEGORY_ORDER = [
  'Produce',
  'Seafood',
  'Meat',
  'Deli & Prepared',
  'Bakery & Bread',
  'Beer & Wine',
  'Pantry & Condiments',
  'Canned & Dry Goods',
  'Baking & Spices',
  'Breakfast & Cereal',
  'Snacks',
  'Beverages',
  'Paper & Household',
  'Pet',
  'Baby',
  'Personal Care',
  'Health & Pharmacy',
  'Dairy & Eggs',
  'Frozen Foods',
] as const

export type HebCategory = (typeof HEB_CATEGORY_ORDER)[number]

/**
 * Category metadata including aisle ranges and whether it's a perimeter department.
 * Perimeter departments don't have numbered aisles.
 */
export const CATEGORY_INFO: Record<
  HebCategory,
  { aisles?: [number, number]; isPerimeter: boolean; description: string }
> = {
  Produce: { isPerimeter: true, description: 'Perimeter — front-left' },
  Seafood: { isPerimeter: true, description: 'Perimeter — left' },
  Meat: { isPerimeter: true, description: 'Perimeter — back-left (Market)' },
  'Deli & Prepared': { isPerimeter: true, description: 'Perimeter — left' },
  'Bakery & Bread': { aisles: [4, 4], isPerimeter: true, description: 'Perimeter + Aisle 4' },
  'Beer & Wine': { aisles: [1, 3], isPerimeter: false, description: 'Interior left' },
  'Pantry & Condiments': { aisles: [4, 5], isPerimeter: false, description: 'Aisles 4–5' },
  'Canned & Dry Goods': { aisles: [6, 6], isPerimeter: false, description: 'Aisle 6' },
  'Baking & Spices': { aisles: [7, 7], isPerimeter: false, description: 'Aisle 7' },
  'Breakfast & Cereal': { aisles: [8, 8], isPerimeter: false, description: 'Aisle 8' },
  Snacks: { aisles: [9, 10], isPerimeter: false, description: 'Aisles 9–10' },
  Beverages: { aisles: [11, 12], isPerimeter: false, description: 'Aisles 11–12, 22–24' },
  'Paper & Household': { aisles: [25, 28], isPerimeter: false, description: 'Aisles 25–28' },
  Pet: { aisles: [29, 30], isPerimeter: false, description: 'Aisles 29–30' },
  Baby: { aisles: [31, 31], isPerimeter: false, description: 'Aisle 31' },
  'Personal Care': { aisles: [32, 35], isPerimeter: false, description: 'Aisles 32–35' },
  'Health & Pharmacy': { aisles: [36, 38], isPerimeter: false, description: 'Aisles 36–38' },
  'Dairy & Eggs': { isPerimeter: true, description: 'Perimeter — right-back' },
  'Frozen Foods': { isPerimeter: true, description: 'Perimeter — front-center' },
}

/**
 * Common grocery items mapped to their typical H-E-B Manor aisle numbers.
 * Used for intra-category sorting. Items not in this map sort alphabetically.
 *
 * Note: This is a curated list based on common recipe ingredients.
 * Perimeter items (produce, meat, dairy, etc.) don't have aisle numbers.
 */
export const ITEM_AISLE_MAP: Record<string, number> = {
  // Bakery & Bread - Aisle 4
  'bread crumbs': 4,
  panko: 4,
  tortillas: 4,
  pita: 4,
  naan: 4,
  'hamburger buns': 4,
  'hot dog buns': 4,
  'sandwich bread': 4,
  'french bread': 4,
  bagels: 4,
  'english muffins': 4,

  // Pantry & Condiments - Aisles 4-5
  ketchup: 4,
  mustard: 4,
  mayonnaise: 4,
  relish: 4,
  'bbq sauce': 4,
  'hot sauce': 5,
  sriracha: 5,
  'soy sauce': 5,
  'fish sauce': 5,
  worcestershire: 5,
  vinegar: 5,
  'apple cider vinegar': 5,
  'balsamic vinegar': 5,
  'rice vinegar': 5,
  'olive oil': 5,
  'vegetable oil': 5,
  'sesame oil': 5,
  'coconut oil': 5,
  pasta: 5,
  spaghetti: 5,
  penne: 5,
  rice: 5,
  'jasmine rice': 5,
  'brown rice': 5,
  quinoa: 5,

  // Canned & Dry Goods - Aisle 6
  'canned tomatoes': 6,
  'diced tomatoes': 6,
  'crushed tomatoes': 6,
  'tomato paste': 6,
  'tomato sauce': 6,
  'canned beans': 6,
  'black beans': 6,
  'kidney beans': 6,
  chickpeas: 6,
  lentils: 6,
  'canned corn': 6,
  'coconut milk': 6,
  'chicken broth': 6,
  'beef broth': 6,
  'vegetable broth': 6,
  'canned tuna': 6,
  'canned salmon': 6,

  // Baking & Spices - Aisle 7
  flour: 7,
  'all-purpose flour': 7,
  'bread flour': 7,
  sugar: 7,
  'brown sugar': 7,
  'powdered sugar': 7,
  'baking powder': 7,
  'baking soda': 7,
  yeast: 7,
  'vanilla extract': 7,
  'cocoa powder': 7,
  'chocolate chips': 7,
  salt: 7,
  pepper: 7,
  'black pepper': 7,
  cumin: 7,
  paprika: 7,
  'chili powder': 7,
  cayenne: 7,
  oregano: 7,
  basil: 7,
  thyme: 7,
  rosemary: 7,
  cinnamon: 7,
  nutmeg: 7,
  'garlic powder': 7,
  'onion powder': 7,
  'italian seasoning': 7,
  'curry powder': 7,
  'garam masala': 7,
  turmeric: 7,
  coriander: 7,

  // Breakfast & Cereal - Aisle 8
  cereal: 8,
  oatmeal: 8,
  oats: 8,
  granola: 8,
  'pancake mix': 8,
  syrup: 8,
  'maple syrup': 8,
  honey: 8,
  'peanut butter': 8,
  'almond butter': 8,
  jam: 8,
  jelly: 8,

  // Snacks - Aisles 9-10
  chips: 9,
  'tortilla chips': 9,
  salsa: 9,
  crackers: 9,
  pretzels: 9,
  popcorn: 10,
  nuts: 10,
  almonds: 10,
  cashews: 10,
  peanuts: 10,
  'trail mix': 10,
  'dried fruit': 10,
  raisins: 10,

  // Beverages - Aisles 11-12
  soda: 11,
  'sparkling water': 11,
  juice: 11,
  'orange juice': 11,
  'apple juice': 12,
  coffee: 12,
  tea: 12,
  water: 12,

  // Paper & Household - Aisles 25-28
  'paper towels': 25,
  napkins: 25,
  'toilet paper': 26,
  tissues: 26,
  'trash bags': 27,
  'plastic wrap': 27,
  'aluminum foil': 27,
  'ziplock bags': 27,
  'dish soap': 28,
  'laundry detergent': 28,
  'cleaning supplies': 28,

  // Pet - Aisles 29-30
  'dog food': 29,
  'cat food': 29,
  'pet treats': 30,

  // Baby - Aisle 31
  diapers: 31,
  'baby food': 31,
  formula: 31,

  // Personal Care - Aisles 32-35
  shampoo: 32,
  conditioner: 32,
  'body wash': 33,
  soap: 33,
  deodorant: 34,
  toothpaste: 34,
  toothbrush: 34,
  razors: 35,
  lotion: 35,

  // Health & Pharmacy - Aisles 36-38
  vitamins: 36,
  'pain reliever': 37,
  'cold medicine': 37,
  'first aid': 38,
  bandages: 38,
}

/**
 * Map legacy 8-category system to new 19-category system.
 * Used for backward compatibility with existing Firestore data.
 */
export const LEGACY_CATEGORY_MAP: Record<string, HebCategory> = {
  // Direct mappings
  Produce: 'Produce',
  Meat: 'Meat',
  Frozen: 'Frozen Foods',

  // Renamed categories
  Dairy: 'Dairy & Eggs',
  Bakery: 'Bakery & Bread',
  Spices: 'Baking & Spices',

  // Categories that need context-aware splitting
  // "Pantry" maps to default; actual mapping happens in mapLegacyCategory()
  Pantry: 'Pantry & Condiments',
  Other: 'Pantry & Condiments', // Default fallback
}

/**
 * Maps a legacy category name to the new 19-category system.
 * For "Pantry" items, attempts to determine the best new category based on item name.
 */
export function mapLegacyCategory(oldCategory: string, itemName?: string): HebCategory {
  // If category is already a valid new category, return it as-is
  if (HEB_CATEGORY_ORDER.includes(oldCategory as HebCategory)) {
    return oldCategory as HebCategory
  }

  // Check direct mapping for legacy categories
  const directMapping = LEGACY_CATEGORY_MAP[oldCategory]
  if (directMapping && oldCategory !== 'Pantry' && oldCategory !== 'Other') {
    return directMapping
  }

  // For Pantry/Other items, try to determine better category from item name
  if (itemName) {
    const lowerName = itemName.toLowerCase()

    // Check for canned goods
    if (
      lowerName.includes('canned') ||
      lowerName.includes('can of') ||
      lowerName.includes('beans') ||
      lowerName.includes('chickpeas') ||
      lowerName.includes('lentils') ||
      lowerName.includes('broth') ||
      lowerName.includes('stock')
    ) {
      return 'Canned & Dry Goods'
    }

    // Check for baking/spices
    if (
      lowerName.includes('flour') ||
      lowerName.includes('sugar') ||
      lowerName.includes('baking') ||
      lowerName.includes('vanilla') ||
      lowerName.includes('cinnamon') ||
      lowerName.includes('nutmeg') ||
      lowerName.includes('cumin') ||
      lowerName.includes('paprika') ||
      lowerName.includes('oregano') ||
      lowerName.includes('thyme') ||
      lowerName.includes('basil') ||
      lowerName.includes('seasoning')
    ) {
      return 'Baking & Spices'
    }

    // Check for breakfast items
    if (
      lowerName.includes('cereal') ||
      lowerName.includes('oatmeal') ||
      lowerName.includes('oats') ||
      lowerName.includes('granola') ||
      lowerName.includes('syrup') ||
      lowerName.includes('honey') ||
      lowerName.includes('peanut butter') ||
      lowerName.includes('jam') ||
      lowerName.includes('jelly')
    ) {
      return 'Breakfast & Cereal'
    }

    // Check for snacks
    if (
      lowerName.includes('chips') ||
      lowerName.includes('crackers') ||
      lowerName.includes('nuts') ||
      lowerName.includes('almonds') ||
      lowerName.includes('cashews') ||
      lowerName.includes('pretzels')
    ) {
      return 'Snacks'
    }

    // Check for beverages
    if (
      lowerName.includes('juice') ||
      lowerName.includes('soda') ||
      lowerName.includes('coffee') ||
      lowerName.includes('tea') ||
      lowerName.includes('water')
    ) {
      return 'Beverages'
    }
  }

  // Default to Pantry & Condiments for unmatched items
  return directMapping || 'Pantry & Condiments'
}

/**
 * Gets the aisle number for an item, if known.
 * Returns undefined for perimeter items or unknown items.
 */
export function getItemAisle(itemName: string): number | undefined {
  const lowerName = itemName.toLowerCase().trim()

  // Check exact match first
  if (ITEM_AISLE_MAP[lowerName]) {
    return ITEM_AISLE_MAP[lowerName]
  }

  // Check for partial matches (item name contains a key)
  for (const [key, aisle] of Object.entries(ITEM_AISLE_MAP)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return aisle
    }
  }

  return undefined
}

/**
 * Gets the default aisle range for a category.
 * Returns undefined for perimeter departments.
 */
export function getCategoryAisleRange(category: HebCategory): [number, number] | undefined {
  return CATEGORY_INFO[category]?.aisles
}

/**
 * Checks if a category is a perimeter department (no numbered aisles).
 */
export function isPerimeterCategory(category: HebCategory): boolean {
  return CATEGORY_INFO[category]?.isPerimeter ?? false
}
