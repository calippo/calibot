// Applica i colori scelti dal gestore come variabili CSS (vuoto = palette di default).
const VARS = { primaryColor: '--maiolica', accentColor: '--arancia' }

export const DEFAULT_COLORS = { primaryColor: '#0a2244', accentColor: '#a8741a' }

export function applyTheme(config) {
  const root = document.documentElement.style
  for (const [key, cssVar] of Object.entries(VARS)) {
    if (config?.[key]) root.setProperty(cssVar, config[key])
    else root.removeProperty(cssVar)
  }
}
