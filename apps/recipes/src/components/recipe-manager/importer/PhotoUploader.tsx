import React from 'react'
import { Camera, Trash2, Upload } from 'lucide-react'
import { Button } from '../../ui/Button'

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
    className={`bg-md-sys-color-surface-variant/10 flex h-64 w-full flex-col items-center justify-center rounded-md-xl border border-dashed border-md-sys-color-outline transition-colors ${
      imagePreview ? 'border-none p-0' : 'group relative'
    }`}
  >
    {imagePreview ? (
      <div className="relative h-full w-full">
        <img
          src={imagePreview}
          className="h-full w-full rounded-md-xl object-cover"
          alt="Preview"
        />
        <button
          onClick={onRemove}
          className="bg-md-sys-color-surface/90 absolute right-2 top-2 rounded-full p-2 shadow-md-1 hover:text-md-sys-color-error"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <div className="flex w-full flex-col items-center gap-4 p-6">
        <div className="mb-2 rounded-full bg-md-sys-color-surface p-4 shadow-md-1">
          <Upload className="h-8 w-8 text-md-sys-color-on-surface-variant" />
        </div>
        <p className="text-sm font-medium text-md-sys-color-on-surface-variant">
          Add a photo of your dish
        </p>

        <div className="flex w-full gap-3">
          <div className="relative flex-1">
            <Button fullWidth intent="secondary">
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
            <Button fullWidth>
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
