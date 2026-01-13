import { useState } from 'react'
import type { Recipe } from '../types'
import { parseRecipe } from '../../components/recipe-manager/importer/api'
import type { InputMode } from '../../components/recipe-manager/importer/SourceToggle'

type Status = 'idle' | 'processing' | 'error'

interface UseAiImporterProps {
  onRecipeParsed: (recipe: Recipe) => void
  mode: InputMode
}

export function useAiImporter({ onRecipeParsed, mode }: UseAiImporterProps) {
  const [url, setUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const [dishName, setDishName] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [knownIngredients, setKnownIngredients] = useState('')
  const [dietaryNotes, setDietaryNotes] = useState('')
  const [tasteProfile, setTasteProfile] = useState('')

  const handleProcess = async () => {
    setStatus('processing')
    setErrorMsg('')
    try {
      const payload = buildPayload()
      const baseUrl = getBaseUrl()
      const data = await parseRecipe(payload, baseUrl)

      const recipeWithSource = {
        ...(data as object),
        sourceImage: mode === 'photo' || mode === 'dish-photo' ? imagePreview : undefined,
        creationMethod: mode === 'dish-photo' ? 'ai-infer' : 'ai-parse',
      } as Recipe

      onRecipeParsed(recipeWithSource)
      setStatus('idle')
    } catch (err: unknown) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  interface ParsePayload {
    url?: string
    image?: string
    mode?: 'parse' | 'infer'
    dishName?: string
    cuisine?: string
    knownIngredients?: string
    dietaryNotes?: string
    tasteProfile?: string
  }

  function buildPayload(): ParsePayload {
    if (mode === 'url') {
      if (!url) throw new Error('Please enter a URL')
      return { url }
    }

    if (!imageData) throw new Error('Please select an image')
    if (imageData.length > 1024 * 1024 * 4) {
      throw new Error('The image is too large. Please try a smaller photo.')
    }

    if (mode === 'dish-photo') {
      return {
        image: imageData,
        mode: 'infer' as const,
        dishName: dishName || undefined,
        cuisine: cuisine || undefined,
        knownIngredients: knownIngredients || undefined,
        dietaryNotes: dietaryNotes || undefined,
        tasteProfile: tasteProfile || undefined,
      }
    }

    return { image: imageData }
  }

  function getBaseUrl() {
    return import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`
  }

  return {
    url,
    setUrl,
    imagePreview,
    setImagePreview,
    imageData,
    setImageData,
    status,
    setStatus,
    errorMsg,
    setErrorMsg,
    dishName,
    setDishName,
    cuisine,
    setCuisine,
    knownIngredients,
    setKnownIngredients,
    dietaryNotes,
    setDietaryNotes,
    tasteProfile,
    setTasteProfile,
    handleProcess,
  }
}
