export interface ShapeData {
  type: 'circle' | 'rect' | 'triangle'
  x: number
  y: number
  size: number
  pattern: string
  speed: number
  float: number
  rot?: number
}

export const SHAPES_DATA: ShapeData[] = [
  {
    type: 'circle',
    x: 10,
    y: 15,
    size: 120,
    pattern: 'url(#pattern-dots)',
    speed: 0.05,
    float: 1,
  },
  {
    type: 'rect',
    x: 85,
    y: 10,
    size: 150,
    pattern: 'url(#pattern-hatch)',
    speed: -0.03,
    float: 1.5,
    rot: 15,
  },
  {
    type: 'triangle',
    x: 5,
    y: 45,
    size: 100,
    pattern: 'url(#pattern-grid)',
    speed: 0.08,
    float: -1,
    rot: 45,
  },
  {
    type: 'circle',
    x: 90,
    y: 60,
    size: 80,
    pattern: 'url(#pattern-dots)',
    speed: 0.02,
    float: 2,
  },
  {
    type: 'rect',
    x: 15,
    y: 75,
    size: 180,
    pattern: 'url(#pattern-hatch)',
    speed: -0.05,
    float: -1.5,
    rot: 15,
  },
  {
    type: 'triangle',
    x: 80,
    y: 85,
    size: 140,
    pattern: 'url(#pattern-grid)',
    speed: 0.04,
    float: 1,
    rot: 45,
  },
]
