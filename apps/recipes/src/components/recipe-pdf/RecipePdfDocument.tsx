import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { Recipe, FamilyRecipeData } from '../../lib/types'
import type { ShareOptions } from '../../lib/share-recipe'

// Using Helvetica (built-in) to avoid external font loading issues
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    color: '#0f172a',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
    color: '#64748b',
    fontSize: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 9,
    color: '#475569',
  },
  description: {
    marginBottom: 16,
    color: '#475569',
    fontSize: 10,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#fef9c3',
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#854d0e',
  },
  recipeImage: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
    borderRadius: 8,
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
  },
  ingredient: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    width: 12,
    fontSize: 10,
  },
  ingredientText: {
    flex: 1,
    fontSize: 10,
  },
  ingredientAmount: {
    fontFamily: 'Helvetica-Bold',
    marginRight: 4,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    paddingTop: 5,
    marginRight: 10,
  },
  stepText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.6,
  },
  note: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  noteAuthor: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 10,
    color: '#475569',
  },
  historyItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    fontSize: 10,
    color: '#64748b',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
  },
  sourceUrl: {
    color: '#3b82f6',
    fontSize: 9,
  },
})

interface RecipePdfDocumentProps {
  recipe: Recipe
  familyData?: FamilyRecipeData
  options: ShareOptions
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function getAverageRating(familyData?: FamilyRecipeData): number | null {
  if (!familyData?.ratings?.length) return null
  const sum = familyData.ratings.reduce((acc, r) => acc + r.rating, 0)
  return Math.round((sum / familyData.ratings.length) * 10) / 10
}

export const RecipePdfDocument: React.FC<RecipePdfDocumentProps> = ({
  recipe,
  familyData,
  options,
}) => {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  const avgRating = getAverageRating(familyData)
  const displayRating = avgRating ?? recipe.rating

  // Collect all notes
  const allNotes: Array<{ author?: string; text: string }> = []
  if (recipe.notes) allNotes.push({ text: recipe.notes })
  if (recipe.userNotes) allNotes.push({ author: 'Personal Note', text: recipe.userNotes })
  if (familyData?.notes?.length) {
    for (const note of familyData.notes) {
      allNotes.push({ author: note.userName, text: note.text })
    }
  }

  // Metadata badges
  const badges: string[] = []
  if (recipe.cuisine) badges.push(recipe.cuisine)
  if (recipe.difficulty) badges.push(recipe.difficulty)
  if (recipe.mealType) badges.push(recipe.mealType)
  if (recipe.dishType) badges.push(recipe.dishType)
  if (recipe.protein) badges.push(recipe.protein)
  recipe.dietary?.forEach((d) => badges.push(d))

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{recipe.title}</Text>

          {/* Time info */}
          <View style={styles.infoRow}>
            {recipe.servings && (
              <View style={styles.infoItem}>
                <Text>👥 {recipe.servings} servings</Text>
              </View>
            )}
            {recipe.prepTime && (
              <View style={styles.infoItem}>
                <Text>⏱️ Prep: {formatTime(recipe.prepTime)}</Text>
              </View>
            )}
            {recipe.cookTime && (
              <View style={styles.infoItem}>
                <Text>🔥 Cook: {formatTime(recipe.cookTime)}</Text>
              </View>
            )}
            {totalTime > 0 && (
              <View style={styles.infoItem}>
                <Text>⏰ Total: {formatTime(totalTime)}</Text>
              </View>
            )}
          </View>

          {/* Metadata badges */}
          {badges.length > 0 && (
            <View style={styles.metadataRow}>
              {badges.map((badge, i) => (
                <Text key={i} style={styles.badge}>
                  {badge}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Recipe image */}
        {options.includePhoto && recipe.sourceImage && (
          <Image style={styles.recipeImage} src={recipe.sourceImage} />
        )}

        {/* Description */}
        {recipe.description && <Text style={styles.description}>{recipe.description}</Text>}

        {/* Rating */}
        {options.includeRatings && displayRating && (
          <View style={styles.ratingSection}>
            <Text style={styles.ratingText}>
              ⭐ {displayRating}/5
              {avgRating && familyData?.ratings?.length
                ? ` (${familyData.ratings.length} ratings)`
                : ''}
            </Text>
          </View>
        )}

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingredient}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.ingredientText}>
                <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                {ing.name}
                {ing.prep ? `, ${ing.prep}` : ''}
              </Text>
            </View>
          ))}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.step}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {options.includeNotes && allNotes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {allNotes.map((note, i) => (
              <View key={i} style={styles.note}>
                {note.author && <Text style={styles.noteAuthor}>{note.author}</Text>}
                <Text style={styles.noteText}>{note.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Cooking History */}
        {options.includeCookingHistory && familyData?.cookingHistory?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cooking History</Text>
            {familyData.cookingHistory.slice(0, 5).map((entry, i) => {
              const date = new Date(entry.cookedAt).toLocaleDateString()
              const reaction =
                entry.wouldMakeAgain === true ? '👍' : entry.wouldMakeAgain === false ? '👎' : ''
              return (
                <View key={i} style={styles.historyItem}>
                  <Text>
                    {date} - {entry.userName} {reaction}
                  </Text>
                </View>
              )
            })}
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated from ChefBoard</Text>
          {recipe.sourceUrl && <Text style={styles.sourceUrl}>{recipe.sourceUrl}</Text>}
        </View>
      </Page>
    </Document>
  )
}
