// 3D layout constants for keychain preview

// Unit conversion: 1 world unit = 10mm
export const MM_PER_UNIT = 10
export const mm2u = (mm: number) => mm / MM_PER_UNIT

// Vertical layout
export const TOP_Y = 1.6 // Ring anchor point (top of scene)
export const STEM_CLEARANCE_MM = 6 // Empty space below ring before first bead center
export const SPACING_MM = 1.5 // Gap between beads
export const STEM_TAIL_MM = 4 // Tail below last bead
export const STEM_MIN_MM = 12 // Minimum visible stem with no beads
export const STEM_MAX_MM = 180 // Maximum stem length (safety cap)

// Default sizes when catalog data missing
export const DEFAULT_BEAD_HEIGHT_MM = 12
export const DEFAULT_CHARM_HEIGHT_MM = 15

// Wire/stem appearance
export const STEM_RADIUS = 0.02
export const STEM_SEGMENTS = 16

// Helper to clamp values
export const clamp = (value: number, min: number, max: number) => 
  Math.max(min, Math.min(max, value))
