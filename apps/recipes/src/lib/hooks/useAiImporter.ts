import { useState } from 'react'
import type { Recipe } from '../types'
import { parseRecipe } from '../../components/recipe-manager/importer/api'
import type { InputMode } from '../../components/recipe-manager/importer/SourceToggle'

type Status = 'idle' | 'processing' | 'error'

interface UseAiImporterProps {
  onRecipeParsed: (
    recipe: Recipe,
    candidateImages?: Array<{ url: string; alt?: string; isDefault?: boolean }>,
  ) => void
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
  const [candidateImages, setCandidateImages] = useState<
    Array<{ url: string; alt?: string; isDefault?: boolean }>
  >([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Blocked site fallback state
  const [isBlocked, setIsBlocked] = useState(false)
  const [pastedText, setPastedText] = useState('')

  const handleProcess = async () => {
    if (abortController) abortController.abort()

    const newController = new AbortController()
    setAbortController(newController)
    setStatus('processing')
    setErrorMsg('')
    setProgressMessage('Consulting Chef Gemini...')

    try {
      const result = await parseRecipe(
        buildPayload(),
        getBaseUrl(),
        newController.signal,
        (msg) => {
          setProgressMessage(msg)
        },
      )

      handleSuccessfulParse(result)
    } catch (err: unknown) {
      handleParseError(err)
    } finally {
      setAbortController(null)
    }
  }

  const handleSuccessfulParse = (result: {
    data: unknown
    candidateImages?: Array<{ url: string; alt?: string; isDefault?: boolean }>
  }) => {
    // Extract candidate images from result if URL mode
    if (mode === 'url' && result.candidateImages && result.candidateImages.length > 0) {
      setCandidateImages(result.candidateImages)
      if (!selectedImage) {
        const defaultImg = result.candidateImages.find((img) => img.isDefault)
        setSelectedImage(defaultImg?.url || result.candidateImages[0].url)
      }
    }

    // Determine which image to use
    let finalImage: string | undefined
    if (mode === 'photo' || mode === 'dish-photo') {
      finalImage = imagePreview || undefined
    } else if (mode === 'url' && selectedImage) {
      finalImage = selectedImage
    }

    const recipeWithSource = {
      ...(result.data as object),
      sourceImage: finalImage,
      creationMethod: mode === 'dish-photo' ? 'ai-infer' : 'ai-parse',
    } as Recipe

    onRecipeParsed(recipeWithSource, mode === 'url' ? result.candidateImages : undefined)
    setStatus('idle')
  }

  const handleParseError = (err: unknown) => {
    if (err instanceof Error && err.name === 'AbortError') {
      setStatus('idle')
      return
    }

    // Detect blocked site error
    if (err instanceof Error && err.message.startsWith('BLOCKED:')) {
      setIsBlocked(true)
      setErrorMsg('')
      setStatus('idle')
      return
    }

    setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    setStatus('error')
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
    text?: string
    mode?: 'parse' | 'infer'
    style?: 'strict' | 'enhanced'
    dishName?: string
    cuisine?: string
    knownIngredients?: string
    dietaryNotes?: string
    tasteProfile?: string
  }

  function buildPayload(): ParsePayload {
    // Handle pasted text fallback (when site is blocked)
    if (isBlocked && pastedText) {
      return { text: pastedText, style: 'strict' }
    }

    if (mode === 'url') {
      if (!url) throw new Error('Please enter a URL')
      return { url, style: 'strict' }
    }

    if (!imageData) throw new Error('Please select an image')
    if (imageData.length > 1024 * 1024 * 9) {
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

  const clearBlockedState = () => {
    setIsBlocked(false)
    setPastedText('')
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
    candidateImages,
    setCandidateImages,
    selectedImage,
    setSelectedImage,
    // Blocked site fallback
    isBlocked,
    pastedText,
    setPastedText,
    clearBlockedState,
  }
}
