import { describe, it, expect } from 'vitest'
import { sniffImageType, SAFE_IMAGE_CONTENT_TYPES } from './image-sniff'

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0))

describe('sniffImageType', () => {
  it('detects JPEG', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00])
    expect(sniffImageType(bytes)).toEqual({ mime: 'image/jpeg', ext: 'jpg' })
  })

  it('detects PNG', () => {
    const bytes = new Uint8Array([0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    expect(sniffImageType(bytes)).toEqual({ mime: 'image/png', ext: 'png' })
  })

  it('detects GIF', () => {
    expect(sniffImageType(new Uint8Array(ascii('GIF89a....')))).toEqual({
      mime: 'image/gif',
      ext: 'gif',
    })
  })

  it('detects WebP', () => {
    const bytes = new Uint8Array([...ascii('RIFF'), 0x10, 0x00, 0x00, 0x00, ...ascii('WEBP')])
    expect(sniffImageType(bytes)).toEqual({ mime: 'image/webp', ext: 'webp' })
  })

  it('detects HEIC and AVIF via ftyp brands', () => {
    const heic = new Uint8Array([0x00, 0x00, 0x00, 0x18, ...ascii('ftypheic'), 0x00])
    expect(sniffImageType(heic)).toEqual({ mime: 'image/heic', ext: 'heic' })

    const avif = new Uint8Array([0x00, 0x00, 0x00, 0x18, ...ascii('ftypavif'), 0x00])
    expect(sniffImageType(avif)).toEqual({ mime: 'image/avif', ext: 'avif' })
  })

  it('rejects HTML, SVG, and other non-image bytes', () => {
    expect(sniffImageType(new Uint8Array(ascii('<!doctype html><script>')))).toBeNull()
    expect(sniffImageType(new Uint8Array(ascii('<svg xmlns="...">')))).toBeNull()
    expect(sniffImageType(new Uint8Array(ascii('plain text')))).toBeNull()
    expect(sniffImageType(new Uint8Array([]))).toBeNull()
  })
})

describe('SAFE_IMAGE_CONTENT_TYPES', () => {
  it('never allows scriptable types inline', () => {
    expect(SAFE_IMAGE_CONTENT_TYPES.has('image/svg+xml')).toBe(false)
    expect(SAFE_IMAGE_CONTENT_TYPES.has('text/html')).toBe(false)
  })
})
