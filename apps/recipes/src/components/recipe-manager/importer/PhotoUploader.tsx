import React from 'react'
import { Camera, Trash2, Upload } from 'lucide-react'
import { Button } from '../../ui/button'

interface PhotoUploaderProps {
  imagePreview: string | null
  onRemove: () => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  imagePreview,
  onRemove,
  handleFileChange,
}) => (
  <div
    className={`bg-card-variant/10 flex h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border transition-colors ${
      imagePreview ? 'border-none p-0' : 'group relative'
    }`}
  >
    {imagePreview ? (
      <div className="relative h-full w-full">
        <img
          src={imagePreview}
          className="h-full w-full rounded-xl object-cover"
          alt="Preview"
        />
        <button
          onClick={onRemove}
          className="bg-card/90 absolute right-2 top-2 rounded-full p-2 shadow-sm hover:text-md-sys-color-error"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <div className="flex w-full flex-col items-center gap-4 p-6">
        <div className="mb-2 rounded-full bg-card p-4 shadow-sm">
          <Upload className="h-8 w-8 text-foreground-variant" />
        </div>
        <p className="text-sm font-medium text-foreground-variant">
          Add a photo of your dish
        </p>

        <div className="flex w-full gap-3">
          <div className="relative flex-1">
            <Button variant="secondary" className="w-full">
              <Upload className="mr-2 h-4 w-4" /> Gallery
            </Button>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
            />
          </div>

          <div className="relative flex-1">
            <Button className="w-full">
              <Camera className="mr-2 h-4 w-4" /> Camera
            </Button>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    )}
  </div>
)
