import { useState } from 'react'
import type { Recipe } from '../types'
import { parseRecipe } from '../../components/recipe-manager/importer/api'
import type { InputMode } from '../../components/recipe-manager/importer/SourceToggle'
import { alert } from '../dialogStore'

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
  // Small library-card variant of imagePreview's upload, set alongside it when a photo is
  // uploaded (see PERFORMANCE-PLAN.md P5). Threaded onto the created recipe as `thumbUrl`.
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [abortController, setAbortController] = useState<AbortController | null>(null)

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
    // Photo-scan/URL import runs on our OCR model, not Gemini — the two must not be conflated
    // in user-facing copy (Gemini powers AI Refresh/Enhancement/grocery lists instead).
    setProgressMessage('Reading your recipe...')

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
    if (mode === 'photo') {
      finalImage = imagePreview || undefined
    } else if (mode === 'url' && selectedImage) {
      finalImage = selectedImage
    }

    const { partialFailure, ...parsedData } = result.data as Record<string, unknown>

    const recipeWithSource = {
      ...parsedData,
      sourceImage: finalImage,
      thumbUrl: mode === 'photo' && thumbUrl ? thumbUrl : undefined,
      creationMethod: 'ai-parse',
    } as Recipe

    onRecipeParsed(recipeWithSource, mode === 'url' ? result.candidateImages : undefined)
    setStatus('idle')

    // The server flags this when an OCR phase failed but there was still enough content to
    // produce a usable recipe (e.g. ingredients read fine, instructions didn't) — tell the user
    // explicitly instead of letting a silently hollow recipe look like a normal successful import.
    if (partialFailure === 'instructions') {
      void alert(
        "We couldn't clearly read the instructions from this photo. Please review and add them before cooking.",
        'Instructions May Be Incomplete',
      )
    }
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

    // Ensure JSON parse / SyntaxErrors show a clean message
    if (
      err instanceof SyntaxError ||
      (err instanceof Error && err.message.includes('Unable to parse recipe response'))
    ) {
      setErrorMsg(
        'The AI response was incomplete. Please try again — if this persists, try a smaller or clearer photo.',
      )
      setStatus('error')
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
    style?: 'strict' | 'enhanced'
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

    // Prefer the uploaded URL to avoid large base64 payloads crashing iOS Safari.
    // Convert relative paths (e.g. /protected/recipes/api/uploads/key) to absolute
    // URLs so the server-side AI parser can fetch the image over HTTP.
    let imagePayload = imageData
    if (imagePreview) {
      if (imagePreview.startsWith('http')) {
        imagePayload = imagePreview
      } else if (imagePreview.startsWith('/')) {
        imagePayload = `${window.location.origin}${imagePreview}`
      }
    }

    // Default to strict for photo scan and url
    return {
      image: imagePayload,
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
    thumbUrl,
    setThumbUrl,
    status,
    setStatus,
    errorMsg,
    setErrorMsg,
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
