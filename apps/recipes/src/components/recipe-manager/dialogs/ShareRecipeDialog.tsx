import React, { useState } from 'react'
import {
  FileText,
  FileDown,
  Loader2,
  Share2,
  Image,
  MessageSquare,
  Star,
  History,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Stack, Inline } from '@/components/ui/layout'
import { pdf } from '@react-pdf/renderer'
import { RecipePdfDocument } from '../../recipe-pdf/RecipePdfDocument'
import {
  shareRecipeText,
  shareRecipePdf,
  defaultShareOptions,
  type ShareOptions,
} from '../../../lib/share-recipe'
import { alert } from '../../../lib/dialogStore'
import type { Recipe, FamilyRecipeData } from '../../../lib/types'

interface ShareRecipeDialogProps {
  recipe: Recipe | null
  familyData?: FamilyRecipeData
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ShareRecipeDialog: React.FC<ShareRecipeDialogProps> = ({
  recipe,
  familyData,
  open,
  onOpenChange,
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [options, setOptions] = useState<ShareOptions>(defaultShareOptions)

  const hasPhoto = Boolean(recipe?.sourceImage)
  const hasNotes = Boolean(
    recipe?.notes || recipe?.userNotes || (familyData?.notes && familyData.notes.length > 0),
  )
  const hasRatings = Boolean(
    recipe?.rating || (familyData?.ratings && familyData.ratings.length > 0),
  )
  const hasHistory = Boolean(familyData?.cookingHistory && familyData.cookingHistory.length > 0)

  const updateOption = <K extends keyof ShareOptions>(key: K, value: ShareOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }))
  }

  const handleShareText = async () => {
    if (!recipe) return

    const result = await shareRecipeText(recipe, familyData, options)

    if (result.success) {
      if (result.method === 'clipboard') {
        await alert('Recipe copied to clipboard!')
      }
      onOpenChange(false)
    }
  }

  const handleSharePdf = async () => {
    if (!recipe) return

    setIsGenerating(true)
    try {
      // Generate PDF blob
      const doc = <RecipePdfDocument recipe={recipe} familyData={familyData} options={options} />
      const blob = await pdf(doc).toBlob()

      const result = await shareRecipePdf(blob, recipe)

      if (result.success) {
        if (result.method === 'download') {
          await alert('PDF downloaded!')
        }
        onOpenChange(false)
      }
    } catch (error) {
      console.error('PDF generation failed:', error)
      await alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!recipe) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Recipe
          </DialogTitle>
          <DialogDescription>Share &quot;{recipe.title}&quot; as text or PDF</DialogDescription>
        </DialogHeader>

        <Stack spacing="md">
          {/* Content Options */}
          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 text-sm font-medium">Include in share:</p>
            <Stack spacing="sm">
              {hasPhoto && (
                <Inline spacing="sm" className="items-center">
                  <Checkbox
                    id="include-photo"
                    checked={options.includePhoto}
                    onCheckedChange={(checked) => updateOption('includePhoto', checked === true)}
                  />
                  <Label htmlFor="include-photo" className="flex items-center gap-2 text-sm">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    Recipe Photo
                  </Label>
                </Inline>
              )}

              {hasNotes && (
                <Inline spacing="sm" className="items-center">
                  <Checkbox
                    id="include-notes"
                    checked={options.includeNotes}
                    onCheckedChange={(checked) => updateOption('includeNotes', checked === true)}
                  />
                  <Label htmlFor="include-notes" className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Notes
                  </Label>
                </Inline>
              )}

              {hasRatings && (
                <Inline spacing="sm" className="items-center">
                  <Checkbox
                    id="include-ratings"
                    checked={options.includeRatings}
                    onCheckedChange={(checked) => updateOption('includeRatings', checked === true)}
                  />
                  <Label htmlFor="include-ratings" className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    Ratings
                  </Label>
                </Inline>
              )}

              {hasHistory && (
                <Inline spacing="sm" className="items-center">
                  <Checkbox
                    id="include-history"
                    checked={options.includeCookingHistory}
                    onCheckedChange={(checked) =>
                      updateOption('includeCookingHistory', checked === true)
                    }
                  />
                  <Label htmlFor="include-history" className="flex items-center gap-2 text-sm">
                    <History className="h-4 w-4 text-muted-foreground" />
                    Cooking History
                  </Label>
                </Inline>
              )}
            </Stack>
          </div>

          {/* Format Selection */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="flex h-auto flex-col gap-2 py-4"
              onClick={handleShareText}
              disabled={isGenerating}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm font-medium">Share as Text</span>
              <span className="text-xs text-muted-foreground">Copy or share plain text</span>
            </Button>

            <Button
              variant="outline"
              className="flex h-auto flex-col gap-2 py-4"
              onClick={handleSharePdf}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileDown className="h-6 w-6" />
              )}
              <span className="text-sm font-medium">Share as PDF</span>
              <span className="text-xs text-muted-foreground">
                {isGenerating ? 'Generating...' : 'Download or share PDF'}
              </span>
            </Button>
          </div>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
