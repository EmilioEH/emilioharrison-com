import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processImage } from './image-optimization'

// Mock heic2any
const mockHeic2Any = vi.hoisted(() => vi.fn())

vi.mock('heic2any', () => ({
  default: mockHeic2Any,
}))

describe('processImage', () => {
  // Mock Image API
  const originalImage = global.Image
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockImage: any

  beforeEach(() => {
    // Basic Mock for Image
    mockImage = {
      onload: null,
      onerror: null,
      src: '',
      width: 100,
      height: 100,
    }
    global.Image = class {
      constructor() {
        return mockImage
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()

    // Mock HTMLCanvasElement
    const mockContext = {
      drawImage: vi.fn(),
    }
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockContext),
      toBlob: vi.fn((callback) => {
        callback(new Blob(['mock-jpg'], { type: 'image/jpeg' }))
      }),
    }
    document.createElement = vi.fn((tagName) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (tagName === 'canvas') return mockCanvas as any
      return document.createElement(tagName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  })

  afterEach(() => {
    global.Image = originalImage
    vi.clearAllMocks()
  })

  it('should pass through non-image files', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    const result = await processImage(file)
    expect(result).toBe(file)
    expect(mockHeic2Any).not.toHaveBeenCalled()
  })

  it('should process standard images (jpg) without heic conversion', async () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

    // Trigger onload immediately when src is set
    Object.defineProperty(mockImage, 'src', {
      set(v) {
        this._src = v
        if (this.onload) this.onload()
      },
      get() {
        return this._src
      },
    })

    const result = await processImage(file)

    expect(mockHeic2Any).not.toHaveBeenCalled()
    expect(result.type).toBe('image/jpeg')
    expect(result).not.toBe(file) // Should be a new file from canvas
  })

  it('should convert HEIC files using heic2any', async () => {
    const file = new File(['heic-content'], 'photo.heic', { type: 'image/heic' })

    // Mock heic2any response
    const jpegBlob = new Blob(['converted-jpg'], { type: 'image/jpeg' })
    mockHeic2Any.mockResolvedValue(jpegBlob)

    // Trigger onload for the *converted* file
    // Note: processImage will wait for heic2any, then create new file, then ensure optimization
    // So we need our Image mock to handle the second pass
    Object.defineProperty(mockImage, 'src', {
      set(v) {
        this._src = v
        if (this.onload) setTimeout(() => this.onload(), 0)
      },
      get() {
        return this._src
      },
    })

    const result = await processImage(file)

    expect(mockHeic2Any).toHaveBeenCalledWith(
      expect.objectContaining({
        blob: file,
        toType: 'image/jpeg',
      }),
    )

    expect(result.name).toBe('photo.jpg')
    expect(result.type).toBe('image/jpeg')
  })

  it('should handle heic2any failure by falling back (or failing) - currently logs error', async () => {
    const file = new File(['heic-content'], 'photo.heic', { type: 'image/heic' })
    mockHeic2Any.mockRejectedValue(new Error('Conversion failed'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // If conversion fails, it falls through to "processImage" logic with the original HEIC file.
    // The original logic relies on "Image" constructor.
    // If "Image" supports HEIC (some browsers), it works. If not (our mock), it might "load" or "error".
    // Our mock "loads" everything, so it will try to draw HEIC to canvas.

    Object.defineProperty(mockImage, 'src', {
      set(v) {
        this._src = v
        if (this.onload) setTimeout(() => this.onload(), 0)
      },
      get() {
        return this._src
      },
    })

    const result = await processImage(file)

    expect(consoleSpy).toHaveBeenCalledWith('HEIC conversion failed', expect.any(Error))
    // Logic proceeds to process the *original* file
    expect(result.type).toBe('image/jpeg') // Outcome of canvas processing
  })
})
