import type { Allergy } from '@/lib/types'

export type AllergyMatch = { allergy: string; ingredient: string }

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function findAllergyMatches(
  ingredients: Array<{ name: string }>,
  allergies: Allergy[],
): AllergyMatch[] {
  const matches: AllergyMatch[] = []
  for (const allergy of allergies) {
    const savedName = normalize(allergy.name)
    if (savedName.length < 3) continue
    for (const ingredient of ingredients) {
      const ingredientName = normalize(ingredient.name)
      if (
        ingredientName.length >= 3 &&
        (savedName === ingredientName ||
          ` ${savedName} `.includes(` ${ingredientName} `) ||
          ` ${ingredientName} `.includes(` ${savedName} `))
      ) {
        matches.push({ allergy: allergy.name, ingredient: ingredient.name })
        break
      }
    }
  }
  return matches
}
