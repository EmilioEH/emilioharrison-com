import React from 'react'
import { CheckCircle2, FolderInput } from 'lucide-react'
import { StarRating } from '../ui/StarRating'

interface ReviewModeProps {
  rating: number
  setRating: (rating: number) => void
  userNotes: string
  setUserNotes: (notes: string) => void
  wouldMakeAgain: boolean
  setWouldMakeAgain: (value: boolean) => void
  finishedImage: string | null
  setFinishedImage: (image: string | null) => void
  handleFinishedImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleFinishCooking: () => void
}

export const ReviewMode: React.FC<ReviewModeProps> = ({
  rating,
  setRating,
  userNotes,
  setUserNotes,
  wouldMakeAgain,
  setWouldMakeAgain,
  finishedImage,
  setFinishedImage,
  handleFinishedImageUpload,
  handleFinishCooking,
}) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 space-y-8 p-6">
      <header className="text-center">
        <h2 className="font-display text-4xl font-bold italic text-primary">
          Chef's Kiss!
        </h2>
        <p className="mt-2 font-body text-lg text-foreground-variant">
          How did it turn out?
        </p>
      </header>

      <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-foreground-variant">
            Rating
          </span>
          <StarRating rating={rating} onRate={setRating} />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="userNotes"
            className="text-xs font-bold uppercase tracking-widest text-foreground-variant"
          >
            Cooking Notes
          </label>
          <textarea
            id="userNotes"
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="Added a pinch more salt next time..."
            className="bg-card-variant/20 h-32 w-full rounded-md border border-border p-4 font-body text-lg outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={() => setWouldMakeAgain(!wouldMakeAgain)}
          className={`flex w-full items-center justify-between rounded-md border p-4 transition-colors ${wouldMakeAgain ? 'border-primary bg-primary-container text-primary-foreground-container' : 'border-border bg-card'}`}
        >
          <span className="font-bold">Would make again?</span>
          {wouldMakeAgain ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <div className="h-6 w-6 rounded-full border-2 border-current" />
          )}
        </button>
      </div>

      {/* Finished Meal Photo Capture */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-foreground-variant">
            Capture the Moment
          </span>
          {finishedImage && (
            <button
              onClick={() => setFinishedImage(null)}
              className="text-xs font-medium text-red-500 hover:underline"
            >
              Remove
            </button>
          )}
        </div>

        {finishedImage ? (
          <div className="relative h-48 w-full overflow-hidden rounded-md border border-border">
            <img src={finishedImage} alt="Finished Meal" className="h-full w-full object-cover" />
          </div>
        ) : (
          <label className="bg-card-variant/20 hover:bg-card-variant/30 flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border transition-colors">
            <div className="mb-2 rounded-full bg-card p-3 shadow-sm">
              <FolderInput className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground-variant">
              Add a photo of your masterpiece
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFinishedImageUpload}
            />
          </label>
        )}
      </div>

      <button
        onClick={handleFinishCooking}
        className="flex w-full items-center justify-center gap-3 rounded-full bg-primary py-4 font-display text-xl font-bold text-primary-foreground shadow-md"
      >
        Save Review & Finish
      </button>
    </div>
  )
}
