import { useState, useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { X, Send, Bug, Lightbulb, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react'
import { processImage } from '../../lib/image-optimization'
import { ResponsiveModal } from '../ui/ResponsiveModal'

// Simple log catcher: in a real app, this might be a sophisticated hook/context
import { logger } from '../../lib/logger'

export const FeedbackModal = ({ isOpen, onClose, appState, user }) => {
  const [type, setType] = useState('bug') // 'bug' | 'idea'
  const [description, setDescription] = useState('')
  const [expected, setExpected] = useState('')
  const [actual, setActual] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const modalRef = useRef(null)

  useEffect(() => {
    if (isOpen && !screenshot) {
      const capture = async () => {
        try {
          const canvas = await html2canvas(document.body, {
            ignoreElements: (element) => {
              // Ignore the modal itself to capture the app state behind it
              return element === modalRef.current
            },
          })
          setScreenshot(canvas.toDataURL('image/png'))
        } catch (err) {
          console.error('Auto-screenshot failed:', err)
        }
      }
      // Small delay to ensure render stability?
      requestAnimationFrame(() => capture())
    }
  }, [isOpen, screenshot])

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        const optimizedFile = await processImage(file)
        const reader = new FileReader()
        reader.onloadend = () => {
          setScreenshot(reader.result)
        }
        reader.readAsDataURL(optimizedFile)
      } catch (err) {
        console.error('Optimization failed', err)
        // Fallback
        const reader = new FileReader()
        reader.onloadend = () => {
          setScreenshot(reader.result)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const feedbackData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      description,
      expected: type === 'bug' ? expected : undefined,
      actual: type === 'bug' ? actual : undefined,
      screenshot,
      logs: logger.getLogs(),
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        user: user || 'Unknown',
        appState: JSON.stringify(appState),
        domSnapshot: document.documentElement.outerHTML,
        windowSize: {
          width: String(window.innerWidth),
          height: String(window.innerHeight),
        },
      },
    }

    try {
      console.log('🚀 Submitting feedback...', feedbackData)
      const response = await fetch('/protected/recipes/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData),
      })

      console.log('📡 Response status:', response.status)

      if (response.ok) {
        setIsSuccess(true)
        setTimeout(() => {
          onClose()
          // Reset form
          setType('bug')
          setDescription('')
          setExpected('')
          setActual('')
          setScreenshot(null)
          setIsSuccess(false)
        }, 2000)
      } else {
        // Try to get the error details from the response
        let errorMessage = 'Failed to submit feedback. please try again.'
        try {
          const errorData = await response.json()
          console.error('❌ Server Error Data:', errorData)
          if (errorData.details) {
            errorMessage = `Error: ${errorData.details}`
          } else if (errorData.error) {
            errorMessage = `Error: ${errorData.error}`
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) {
          // If response isn't JSON, use status text
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }
        alert(`Submit Failed: ${errorMessage}\n\nCheck console for details.`)
      }
    } catch (error) {
      console.error('Feedback Error:', error)
      alert(
        `A technical error occurred: ${error.message || error}\n\nMake sure ad-blockers are disabled.`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Feedback"
      ref={modalRef}
      footer={
        isSuccess ? null : (
          <div className="flex items-center justify-between pt-2">
            <p className="max-w-[180px] text-[10px] italic leading-tight opacity-50">
              Technical context (logs, state, OS) will be included automatically.
            </p>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-md-sys-color-primary text-md-sys-color-on-primary flex items-center gap-2 rounded-full px-8 py-3 font-bold shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" /> Send Feedback
                </>
              )}
            </button>
          </div>
        )
      }
    >
      {isSuccess ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-90">
          <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
          <h3 className="text-xl font-bold">Thank you!</h3>
          <p className="text-sm opacity-70">Your feedback has been received.</p>
        </div>
      ) : (
        <form className="flex flex-col gap-6 p-1">
          {/* Feedback Type */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setType('bug')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 font-bold transition-all ${
                type === 'bug'
                  ? 'bg-md-sys-color-primary/10 border-md-sys-color-primary text-md-sys-color-primary'
                  : 'bg-card-variant border-transparent opacity-60'
              }`}
            >
              <Bug className="h-4 w-4" /> Bug Report
            </button>
            <button
              type="button"
              onClick={() => setType('idea')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 font-bold transition-all ${
                type === 'idea'
                  ? 'bg-md-sys-color-tertiary/10 border-md-sys-color-tertiary text-md-sys-color-tertiary'
                  : 'bg-card-variant border-transparent opacity-60'
              }`}
            >
              <Lightbulb className="h-4 w-4" /> Idea / Idea
            </button>
          </div>

          {/* Description */}
          <div className="space-y-4">
            {type === 'bug' ? (
              <>
                <div>
                  <label
                    htmlFor="feedback-actual"
                    className="text-md-sys-color-on-surface-variant mb-2 block text-xs font-black uppercase tracking-widest"
                  >
                    What happened? (Actual)
                  </label>
                  <textarea
                    id="feedback-actual"
                    required
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                    placeholder="e.g., The search button didn't react when I clicked it."
                    className="border-md-sys-color-outline bg-card-variant focus:ring-md-sys-color-primary min-h-[80px] w-full rounded-xl border p-4 text-sm outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label
                    htmlFor="feedback-expected"
                    className="text-md-sys-color-on-surface-variant mb-2 block text-xs font-black uppercase tracking-widest"
                  >
                    What did you expect?
                  </label>
                  <textarea
                    id="feedback-expected"
                    required
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    placeholder="e.g., I expected the search results to appear below the input."
                    className="border-md-sys-color-outline bg-card-variant focus:ring-md-sys-color-primary min-h-[80px] w-full rounded-xl border p-4 text-sm outline-none focus:ring-2"
                  />
                </div>
              </>
            ) : (
              <div>
                <label
                  htmlFor="feedback-idea"
                  className="text-md-sys-color-on-surface-variant mb-2 block text-xs font-black uppercase tracking-widest"
                >
                  Tell us about your idea
                </label>
                <textarea
                  id="feedback-idea"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the enhancement or new feature you'd like to see..."
                  className="border-md-sys-color-outline bg-card-variant focus:ring-md-sys-color-tertiary min-h-[160px] w-full rounded-xl border p-4 text-sm outline-none focus:ring-2"
                />
              </div>
            )}
          </div>

          {/* Screenshot Upload */}
          <div>
            <label
              htmlFor="feedback-screenshot"
              className="text-md-sys-color-on-surface-variant mb-2 block text-xs font-black uppercase tracking-widest"
            >
              Visual Context (Optional)
            </label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="feedback-screenshot"
                className="border-md-sys-color-outline flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-colors hover:bg-black/5"
              >
                <ImageIcon className="h-4 w-4" />
                {screenshot ? 'Change Screenshot' : 'Upload Screenshot'}
              </label>
              <input
                id="feedback-screenshot"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {screenshot && (
                <div className="border-md-sys-color-outline relative h-12 w-12 overflow-hidden rounded border">
                  <img src={screenshot} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setScreenshot(null)}
                    className="absolute right-0 top-0 rounded-bl bg-red-500 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </ResponsiveModal>
  )
}
