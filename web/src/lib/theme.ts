export interface AccentPreset {
  name:  string
  label: string
  value: string // hex for display
  vars:  Record<string, string> // RGB triplets for CSS custom props
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'orange', label: 'Laranja', value: '#f97316', vars: { 50:'255 247 237',100:'255 237 213',200:'254 215 170',300:'253 186 116',400:'251 146 60',500:'249 115 22',600:'234 88 12',700:'194 65 12',800:'154 52 18',900:'124 45 18' } },
  { name: 'blue',   label: 'Azul',    value: '#3b82f6', vars: { 50:'239 246 255',100:'219 234 254',200:'191 219 254',300:'147 197 253',400:'96 165 250',500:'59 130 246',600:'37 99 235',700:'29 78 216',800:'30 64 175',900:'30 58 138' } },
  { name: 'green',  label: 'Verde',   value: '#22c55e', vars: { 50:'240 253 244',100:'220 252 231',200:'187 247 208',300:'134 239 172',400:'74 222 128',500:'34 197 94',600:'22 163 74',700:'21 128 61',800:'22 101 52',900:'20 83 45' } },
  { name: 'purple', label: 'Roxo',    value: '#a855f7', vars: { 50:'250 245 255',100:'243 232 255',200:'233 213 255',300:'216 180 254',400:'192 132 252',500:'168 85 247',600:'147 51 234',700:'126 34 206',800:'107 33 168',900:'88 28 135' } },
  { name: 'pink',   label: 'Rosa',    value: '#ec4899', vars: { 50:'253 242 248',100:'252 231 243',200:'251 207 232',300:'249 168 212',400:'244 114 182',500:'236 72 153',600:'219 39 119',700:'190 24 93',800:'157 23 77',900:'131 24 67' } },
]

export const DEFAULT_ACCENT = ACCENT_PRESETS[0]

function applyPresetVars(preset: AccentPreset) {
  const root = document.documentElement
  Object.entries(preset.vars).forEach(([k, v]) =>
    root.style.setProperty(`--accent-${k}`, v)
  )
}

export function applyAccentColor(colorName: string) {
  const preset = ACCENT_PRESETS.find((p) => p.name === colorName) ?? DEFAULT_ACCENT
  applyPresetVars(preset)
}

export function applyPlatformAccent() {
  applyPresetVars(DEFAULT_ACCENT)
}
