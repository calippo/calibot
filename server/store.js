// In-memory store. Nessun database: tutto vive in RAM finché il server è acceso.

let nextDocId = 1

const state = {
  config: {
    name: 'Agriturismo Zàgara',
    tagline: 'Dove la lava incontra gli agrumi',
    location: 'Contrada Carrubo, pendici dell’Etna — Catania, Sicilia',
    description:
      'Un antico baglio di pietra lavica circondato da limoneti e aranceti, a venti minuti dal mare di Catania e a un passo dai sentieri dell’Etna. Camere con vista vulcano, cucina contadina a km zero e l’ospitalità schietta di una famiglia siciliana.',
    contact: '+39 095 000 0000 · ciao@agriturismozagara.it',
    welcome:
      'Ciao! Sono l’assistente di Agriturismo Zàgara. Posso aiutarti con i servizi della struttura, gli orari, le camere e cosa vedere sull’Etna e a Catania. Cosa ti serve?',
  },
  // docs: documenti markdown caricati dall'admin
  docs: [],
  // chunks: pezzi di documento indicizzati per la ricerca (embedding opzionale)
  chunks: [],
}

export function getConfig() {
  return state.config
}

export function updateConfig(patch) {
  state.config = { ...state.config, ...patch }
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
  return doc
}

export function removeDoc(id) {
  const before = state.docs.length
  state.docs = state.docs.filter((d) => d.id !== id)
  state.chunks = state.chunks.filter((c) => c.docId !== id)
  return state.docs.length < before
}

// --- chunks ---
export function getChunks() {
  return state.chunks
}

export function setChunksForDoc(docId, chunks) {
  state.chunks = state.chunks.filter((c) => c.docId !== docId)
  state.chunks.push(...chunks)
}

export default state
