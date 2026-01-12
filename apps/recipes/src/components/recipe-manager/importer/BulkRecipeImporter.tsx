import React, { useState } from 'react'
import { Loader2, ChefHat, FolderUp, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stack } from '@/components/ui/layout'
import type { Recipe } from '../../../lib/types'
import { processImage } from '../../../lib/image-optimization'
import { uploadImage, parseRecipe } from './api'

interface BulkRecipeImporterProps {
  onRecipesParsed: (recipes: Recipe[]) => void
  onClose: () => void
}

export const BulkRecipeImporter: React.FC<BulkRecipeImporterProps> = ({
  onRecipesParsed,
  onClose,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [status, setStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle')
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [resultsIcon, setResultsIcon] = useState<React.ReactNode>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files))
      setErrorMsg('')
    }
  }

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleProcess = async () => {
    setStatus('processing')
    setErrorMsg('')

    // Base URL
    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`

    try {
      // Filter for markdown files
      const markdownFiles = selectedFiles.filter(
        (f) => f.name.endsWith('.md') || f.name.endsWith('.markdown'),
      )

      if (markdownFiles.length === 0) {
        throw new Error('No markdown files (md/markdown) found in selection.')
      }

      const results: Recipe[] = []

      for (let i = 0; i < markdownFiles.length; i++) {
        setProgress({ current: i + 1, total: markdownFiles.length })
        const mdFile = markdownFiles[i]

        // Find associated image in the same directory (relative path from webkitdirectory)
        let associatedImage: File | undefined

        if (mdFile.webkitRelativePath) {
          const pathParts = mdFile.webkitRelativePath.split('/')
          const dirPath = pathParts.slice(0, -1).join('/')

          associatedImage = selectedFiles.find((f) => {
            if (f === mdFile) return false
            if (!f.type.startsWith('image/')) return false
            // Check if file is in the same directory
            return f.webkitRelativePath.startsWith(dirPath + '/')
          })
        } else {
          // Fallback for flat file selection: match basename
          const baseName = mdFile.name.replace(/\.(md|markdown)$/i, '')
          associatedImage = selectedFiles.find((f) => {
            return f.type.startsWith('image/') && f.name.includes(baseName)
          })
        }

        const textContent = await readFileAsText(mdFile)
        let imageBase64: string | undefined
        let uploadedImageUrl: string | undefined

        if (associatedImage) {
          try {
            // Optimize image
            const processedImg = await processImage(associatedImage)
            imageBase64 = await readFileAsBase64(processedImg)
            // Upload to get public URL
            uploadedImageUrl = (await uploadImage(processedImg, baseUrl)) || undefined
          } catch (e) {
            console.warn('Failed to process associated image for ' + mdFile.name, e)
          }
        }

        const payload = { text: textContent, image: imageBase64 }
        const data = await parseRecipe(payload, baseUrl)

        results.push({
          ...(data as object),
          sourceImage: uploadedImageUrl,
          // If no title parsed, fallback to filename
          title: (data as Recipe).title || mdFile.name.replace('.md', ''),
        } as Recipe)
      }

      setStatus('complete')
      setResultsIcon(<CheckCircle className="h-12 w-12 text-primary animate-in zoom-in" />)
      onRecipesParsed(results)
    } catch (err: unknown) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
      setResultsIcon(<AlertCircle className="h-12 w-12 text-destructive animate-in zoom-in" />)
      setProgress(null)
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-card animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-display text-xl font-bold">Import Recipes</h2>
        <button onClick={onClose} className="hover:bg-card-variant rounded-full p-2">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Stack spacing="xl" className="mx-auto max-w-lg">
          <Stack spacing="xs" className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FolderUp className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold">Bulk Import</h3>
            <p className="text-foreground-variant">
              Upload a folder or multiple Markdown files.
              <br />
              <span className="text-xs opacity-70">
                We'll automatically match images in the same folder.
              </span>
            </p>
          </Stack>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Folder Upload (Desktop/Organized) */}
            <div className="hover:bg-card-variant/50 relative flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors">
              <input
                type="file"
                id="bulk-folder-upload"
                className="hidden"
                onChange={handleFileChange}
                multiple
                // @ts-expect-error - webkitdirectory is not standard but supported
                webkitdirectory=""
              />
              <label htmlFor="bulk-folder-upload" className="absolute inset-0 cursor-pointer">
                <span className="sr-only">Upload Folder</span>
              </label>
              <div className="bg-secondary-container text-on-secondary-container rounded-full p-3">
                <FolderUp className="h-6 w-6" />
              </div>
              <div>
                <span className="mb-1 block font-bold text-foreground">Upload Folder</span>
                <span className="text-foreground-variant block text-xs">
                  Best for Desktop. Keeps images linked.
                </span>
              </div>
            </div>

            {/* File Upload (Mobile/Drive) */}
            <div className="hover:bg-card-variant/50 relative flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors">
              <input
                type="file"
                id="bulk-file-upload"
                className="hidden"
                onChange={handleFileChange}
                multiple
                accept=".md,.markdown,image/*"
              />
              <label htmlFor="bulk-file-upload" className="absolute inset-0 cursor-pointer">
                <span className="sr-only">Select Files</span>
              </label>
              <div className="bg-tertiary-container text-on-tertiary-container rounded-full p-3">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <span className="mb-1 block font-bold text-foreground">Select Files</span>
                <span className="text-foreground-variant block text-xs">
                  For Google Drive, iCloud, & Mobile.
                </span>
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <Stack spacing="xs" className="bg-card-variant rounded-lg border border-border p-4">
              <div className="flex items-center justify-between font-bold">
                <span>{selectedFiles.length} files selected</span>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-sm text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="text-foreground-variant text-xs">
                {selectedFiles.filter((f) => f.name.endsWith('.md')).length} Markdown files found
              </div>
            </Stack>
          )}

          {status === 'processing' && (
            <Stack spacing="md" className="animate-in fade-in">
              <div className="bg-secondary-container h-2 w-full overflow-hidden rounded-full">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{
                    width: progress ? `${(progress.current / progress.total) * 100}%` : '0%',
                  }}
                />
              </div>
              <p className="text-center font-medium text-primary">
                Processing {progress?.current} of {progress?.total} recipes...
              </p>
              <p className="text-foreground-variant animate-pulse text-center text-xs">
                Asking Chef Gemini to read your notes...
              </p>
            </Stack>
          )}

          {status === 'complete' && (
            <Stack spacing="md" className="text-center animate-in fade-in zoom-in">
              {resultsIcon}
              <p className="text-lg font-bold text-green-600">Import Complete!</p>
            </Stack>
          )}

          {errorMsg && (
            <div className="shake rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive">
              {errorMsg}
            </div>
          )}
        </Stack>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-border bg-card p-4">
        <Button
          className="h-12 w-full text-lg"
          size="lg"
          onClick={handleProcess}
          disabled={status === 'processing' || selectedFiles.length === 0 || status === 'complete'}
        >
          {status === 'processing' ? (
            <Loader2 className="mr-2 animate-spin" />
          ) : (
            <ChefHat className="mr-2" />
          )}
          {status === 'processing' ? 'Processing...' : 'Start Import'}
        </Button>
      </div>
    </div>
  )
}
