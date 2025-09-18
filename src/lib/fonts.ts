// Basic font data for Three.js Text3D
// In a real implementation, you would load actual .json font files
export const defaultFont = {
  "glyphs": {},
  "familyName": "helvetiker",
  "ascender": 1462,
  "descender": -434,
  "underlinePosition": -63,
  "underlineThickness": 86,
  "boundingBox": {
    "yMin": -434,
    "xMin": -153,
    "yMax": 1462,
    "xMax": 2157
  }
}

// This is a placeholder - in production you'd load real Three.js font files
export const getFontData = (fontName: string) => {
  return "/fonts/helvetiker_regular.typeface.json"
}