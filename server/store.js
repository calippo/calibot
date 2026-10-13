// Store in memoria, salvato su un file JSON a ogni modifica.
// Su Render il file sta sul disco persistente (DATA_DIR), così sopravvive a riavvii e deploy.
import { randomBytes } from 'crypto'
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'state.json')

let nextDocId = 1

// Codice di accesso ospiti: senza ambiguità (niente I/O/0/1), facile da dettare.
function genCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(6)
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length]
  return code
}

const state = {
  config: {
    name: 'Zàgara',
    tagline: 'Dove la lava incontra gli agrumi',
    location: 'Contrada Carrubo, pendici dell’Etna — Catania, Sicilia',
    description:
      'Un antico baglio di pietra lavica circondato da limoneti e aranceti, a venti minuti dal mare di Catania e a un passo dai sentieri dell’Etna. Camere con vista vulcano, cucina contadina a km zero e l’ospitalità schietta di una famiglia siciliana.',
    contact: '+39 095 000 0000 · ciao@zagara.it',
    welcome:
      'Ciao! Sono l’assistente di Zàgara. Posso aiutarti con i servizi della struttura, gli orari, le camere e cosa vedere sull’Etna e a Catania. Cosa ti serve?',
    // Logo (data URL). Se vuoto, in pagina si mostra il nome come testo.
    logo: '',
    // Immagine di sfondo del pannello info (data URL). Se vuoto, usa quella di default.
    backgroundImage: '',
    // Servizi in evidenza mostrati sotto la descrizione.
    services: [
      'Camere vista Etna',
      'Colazione contadina',
      'Cucina a km zero',
      'Piscina stagionale',
      'Noleggio e-bike',
      'Pet friendly',
    ],
    // Informazioni sul finanziamento (mostrate in fondo alla pagina, in piccolo).
    funding: '',
    // Colori del tema (vuoto = palette di default).
    primaryColor: '',
    accentColor: '',
  },
  // docs: documenti markdown caricati dall'admin
  docs: [],
  // chunks: pezzi di documento indicizzati per la ricerca (embedding opzionale)
  chunks: [],
  // codice che gli ospiti devono inserire per usare la chat
  accessCode: genCode(),
}

// --- persistenza su file ---
// Ritorna true se c'era uno stato salvato (in quel caso non si caricano i documenti seed).
export function loadState() {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    state.config = { ...state.config, ...saved.config }
    state.docs = saved.docs || []
    state.chunks = saved.chunks || []
    if (saved.accessCode) state.accessCode = saved.accessCode
    nextDocId = state.docs.reduce((max, d) => Math.max(max, d.id), 0) + 1
    return true
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[store] stato salvato illeggibile:', err.message)
    return false
  }
}

// Scrittura atomica: file temporaneo + rename, così un crash non lascia un JSON a metà.
export function saveState() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const tmp = `${DATA_FILE}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(state))
    fs.renameSync(tmp, DATA_FILE)
  } catch (err) {
    console.error('[store] salvataggio fallito:', err.message)
  }
}

export function getConfig() {
  return state.config
}

export function updateConfig(patch) {
  state.config = { ...state.config, ...patch }
  saveState()
  return state.config
}

export function listDocs() {
  return state.docs.map(({ id, title, createdAt, content }) => ({
    id,
    title,
    createdAt,
    chars: content.length,
  }))
}

export function getDoc(id) {
  return state.docs.find((d) => d.id === id) || null
}

export function addDoc({ title, content }) {
  const doc = {
    id: nextDocId++,
    title: title?.trim() || 'Documento senza titolo',
    content: content || '',
    createdAt: new Date().toISOString(),
  }
  state.docs.push(doc)
  saveState()
  return doc
}

export function removeDoc(id) {
  const before = state.docs.length
  state.docs = state.docs.filter((d) => d.id !== id)
  state.chunks = state.chunks.filter((c) => c.docId !== id)
  saveState()
  return state.docs.length < before
}

// --- codice di accesso ---
export function getAccessCode() {
  return state.accessCode
}

export function regenerateAccessCode() {
  state.accessCode = genCode()
  saveState()
  return state.accessCode
}

// --- chunks ---
export function getChunks() {
  return state.chunks
}

export function setChunksForDoc(docId, chunks) {
  state.chunks = state.chunks.filter((c) => c.docId !== docId)
  state.chunks.push(...chunks)
  saveState()
}

export default state
