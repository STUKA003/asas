export interface AccentPreset {
  name:  string
  label: string
  value: string // hex for display
  vars:  Record<string, string> // RGB triplets for CSS custom props
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'blue', label: 'Azul', value: '#4f46e5', vars: { 50: '238 242 255', 100: '224 231 255', 200: '199 210 254', 300: '165 180 252', 400: '129 140 248', 500: '79 70 229', 600: '67 56 202', 700: '55 48 163', 800: '49 46 129', 900: '30 27 75' } },
  { name: 'orange', label: 'Laranja', value: '#ea580c', vars: { 50: '255 247 237', 100: '255 237 213', 200: '254 215 170', 300: '253 186 116', 400: '251 146 60', 500: '234 88 12', 600: '194 65 12', 700: '154 52 18', 800: '124 45 18', 900: '103 37 15' } },
  { name: 'green', label: 'Verde', value: '#16a34a', vars: { 50: '240 253 244', 100: '220 252 231', 200: '187 247 208', 300: '134 239 172', 400: '74 222 128', 500: '22 163 74', 600: '21 128 61', 700: '22 101 52', 800: '20 83 45', 900: '20 46 31' } },
  { name: 'purple', label: 'Roxo', value: '#7c3aed', vars: { 50: '245 243 255', 100: '237 233 254', 200: '221 214 254', 300: '196 181 253', 400: '167 139 250', 500: '124 58 237', 600: '109 40 217', 700: '91 33 182', 800: '76 29 149', 900: '46 16 101' } },
  { name: 'pink', label: 'Rosa', value: '#db2777', vars: { 50: '253 242 248', 100: '252 231 243', 200: '251 207 232', 300: '249 168 212', 400: '244 114 182', 500: '219 39 119', 600: '190 24 93', 700: '157 23 77', 800: '131 24 67', 900: '80 7 36' } },
]

export const DEFAULT_ACCENT = ACCENT_PRESETS[0]

function applyPresetVars(preset: AccentPreset) {
  const root = document.documentElement
  Object.entries(preset.vars).forEach(([k, v]) => {
    root.style.setProperty(`--primary-${k}`, v)
    root.style.setProperty(`--accent-${k}`, v)
  })
}

export function applyAccentColor(colorName: string) {
  const preset = ACCENT_PRESETS.find((p) => p.name === colorName) ?? DEFAULT_ACCENT
  applyPresetVars(preset)
}

export function applyPlatformAccent() {
  applyPresetVars(DEFAULT_ACCENT)
}
