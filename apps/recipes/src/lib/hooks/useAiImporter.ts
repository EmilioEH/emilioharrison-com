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
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const [dishName, setDishName] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [knownIngredients, setKnownIngredients] = useState('')
  const [dietaryNotes, setDietaryNotes] = useState('')
  const [tasteProfile, setTasteProfile] = useState('')

  const [progressMessage, setProgressMessage] = useState('')

  const handleProcess = async () => {
    // Cancel any existing request
    if (abortController) {
      abortController.abort()
    }

    const newController = new AbortController()
    setAbortController(newController)
    setStatus('processing')
    setErrorMsg('')
    setProgressMessage('Consulting Chef Gemini...')

    try {
      const payload = buildPayload()
      const baseUrl = getBaseUrl()
      const data = await parseRecipe(payload, baseUrl, newController.signal, (msg) => {
        setProgressMessage(msg)
      })

      const recipeWithSource = {
        ...(data as object),
        sourceImage: mode === 'photo' || mode === 'dish-photo' ? imagePreview : undefined,
        creationMethod: mode === 'dish-photo' ? 'ai-infer' : 'ai-parse',
      } as Recipe

      onRecipeParsed(recipeWithSource)
      setStatus('idle')
      setAbortController(null)
    } catch (err: unknown) {
      // Don't show error if request was cancelled
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus('idle')
        return
      }

      // console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
      setAbortController(null)
    }
  }

  const handleCancel = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setStatus('idle')
    }
  }

  interface ParsePayload {
    url?: string
    image?: string
    mode?: 'parse' | 'infer'
    style?: 'strict' | 'enhanced'
    dishName?: string
    cuisine?: string
    knownIngredients?: string
    dietaryNotes?: string
    tasteProfile?: string
  }

  function buildPayload(): ParsePayload {
    if (mode === 'url') {
      if (!url) throw new Error('Please enter a URL')
      return { url, style: 'strict' }
    }

    if (!imageData) throw new Error('Please select an image')
    if (imageData.length > 1024 * 1024 * 4) {
      throw new Error('The image is too large. Please try a smaller photo.')
    }

    if (mode === 'dish-photo') {
      return {
        image: imageData,
        mode: 'infer' as const,
        style: 'enhanced', // Kenji-style enhancement for dish photos
        dishName: dishName || undefined,
        cuisine: cuisine || undefined,
        knownIngredients: knownIngredients || undefined,
        dietaryNotes: dietaryNotes || undefined,
        tasteProfile: tasteProfile || undefined,
      }
    }

    // Default to strict for photo scan and url
    return {
      image: imageData,
      style: 'strict',
    }
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
    handleCancel,
    progressMessage,
  }
}
