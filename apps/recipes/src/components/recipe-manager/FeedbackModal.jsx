import { useState } from 'react'
import { X, Send, Bug, Lightbulb, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react'

// Simple log catcher: in a real app, this might be a sophisticated hook/context
const getRecentLogs = () => {
  // Mocking recent logs for this session
  return [`[INFO] Session started at ${new Date().toISOString()}`, `[INFO] App version: 1.2.0`]
}

export const FeedbackModal = ({ isOpen, onClose, appState, user }) => {
  const [type, setType] = useState('bug') // 'bug' | 'idea'
  const [description, setDescription] = useState('')
  const [expected, setExpected] = useState('')
  const [actual, setActual] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setScreenshot(reader.result)
      }
      reader.readAsDataURL(file)
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
      logs: getRecentLogs(),
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        user: user || 'Unknown',
        appState: JSON.stringify(appState),
      },
    }

    try {
      const response = await fetch('/protected/recipes/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData),
      })

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
        alert('Failed to submit feedback. please try again.')
      }
    } catch (error) {
      console.error('Feedback Error:', error)
      alert('A technical error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm duration-200">
      <div className="animate-in zoom-in-95 w-full max-w-lg overflow-hidden rounded-2xl border border-md-sys-color-outline bg-md-sys-color-surface shadow-2xl duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-md-sys-color-outline px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-md-sys-color-primary">
              Submit Feedback
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-black/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="animate-in zoom-in-90 flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
            <h3 className="text-xl font-bold">Thank you!</h3>
            <p className="text-sm opacity-70">Your feedback has been received.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
            {/* Feedback Type */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 font-bold transition-all ${
                  type === 'bug'
                    ? 'bg-md-sys-color-primary/10 border-md-sys-color-primary text-md-sys-color-primary'
                    : 'border-transparent bg-md-sys-color-surface-variant opacity-60'
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
                    : 'border-transparent bg-md-sys-color-surface-variant opacity-60'
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
                      className="mb-2 block text-xs font-black uppercase tracking-widest text-md-sys-color-on-surface-variant"
                    >
                      What happened? (Actual)
                    </label>
                    <textarea
                      id="feedback-actual"
                      required
                      value={actual}
                      onChange={(e) => setActual(e.target.value)}
                      placeholder="e.g., The search button didn't react when I clicked it."
                      className="min-h-[80px] w-full rounded-xl border border-md-sys-color-outline bg-md-sys-color-surface-variant p-4 text-sm outline-none focus:ring-2 focus:ring-md-sys-color-primary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="feedback-expected"
                      className="mb-2 block text-xs font-black uppercase tracking-widest text-md-sys-color-on-surface-variant"
                    >
                      What did you expect?
                    </label>
                    <textarea
                      id="feedback-expected"
                      required
                      value={expected}
                      onChange={(e) => setExpected(e.target.value)}
                      placeholder="e.g., I expected the search results to appear below the input."
                      className="min-h-[80px] w-full rounded-xl border border-md-sys-color-outline bg-md-sys-color-surface-variant p-4 text-sm outline-none focus:ring-2 focus:ring-md-sys-color-primary"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label
                    htmlFor="feedback-idea"
                    className="mb-2 block text-xs font-black uppercase tracking-widest text-md-sys-color-on-surface-variant"
                  >
                    Tell us about your idea
                  </label>
                  <textarea
                    id="feedback-idea"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the enhancement or new feature you'd like to see..."
                    className="min-h-[160px] w-full rounded-xl border border-md-sys-color-outline bg-md-sys-color-surface-variant p-4 text-sm outline-none focus:ring-2 focus:ring-md-sys-color-tertiary"
                  />
                </div>
              )}
            </div>

            {/* Screenshot Upload */}
            <div>
              <label
                htmlFor="feedback-screenshot"
                className="mb-2 block text-xs font-black uppercase tracking-widest text-md-sys-color-on-surface-variant"
              >
                Visual Context (Optional)
              </label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="feedback-screenshot"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-md-sys-color-outline px-4 py-2 text-sm font-bold transition-colors hover:bg-black/5"
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
                  <div className="relative h-12 w-12 overflow-hidden rounded border border-md-sys-color-outline">
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

            {/* Footer / Submit */}
            <div className="flex items-center justify-between border-t border-md-sys-color-outline pt-6">
              <p className="max-w-[180px] text-[10px] italic leading-tight opacity-50">
                Technical context (logs, state, OS) will be included automatically.
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-full bg-md-sys-color-primary px-8 py-3 font-bold text-md-sys-color-on-primary shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
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
          </form>
        )}
      </div>
    </div>
  )
}
