import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import {
  getConfig,
  updateConfig,
  listDocs,
  getDoc,
  addDoc,
  removeDoc,
} from './store.js'
import { indexDoc, chat, hasKey } from './rag.js'
import { seedDocs } from './seed.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

const PORT = process.env.PORT || 3001

// --- Config ---
app.get('/api/config', (_req, res) => {
  res.json({ config: getConfig(), hasKey })
})

app.put('/api/config', (req, res) => {
  const allowed = ['name', 'tagline', 'location', 'description', 'contact', 'welcome']
  const patch = {}
  for (const k of allowed) if (k in req.body) patch[k] = req.body[k]
  res.json({ config: updateConfig(patch) })
})

// --- Documenti ---
app.get('/api/docs', (_req, res) => {
  res.json({ docs: listDocs() })
})

app.get('/api/docs/:id', (req, res) => {
  const doc = getDoc(Number(req.params.id))
  if (!doc) return res.status(404).json({ error: 'Documento non trovato' })
  res.json({ doc })
})

app.post('/api/docs', async (req, res) => {
  const { title, content } = req.body || {}
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Il contenuto del documento è vuoto' })
  }
  const doc = addDoc({ title, content })
  const chunks = await indexDoc(doc)
  res.status(201).json({ doc: { id: doc.id, title: doc.title, createdAt: doc.createdAt }, chunks })
})

app.delete('/api/docs/:id', (req, res) => {
  const ok = removeDoc(Number(req.params.id))
  if (!ok) return res.status(404).json({ error: 'Documento non trovato' })
  res.json({ ok: true })
})

// --- Chat ---
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body || {}
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'messages mancanti' })
  }
  try {
    const result = await chat(messages)
    res.json(result)
  } catch (err) {
    console.error('[chat] errore:', err)
    res.status(500).json({ error: 'Errore nel generare la risposta', detail: err.message })
  }
})

// Indicizza i documenti di esempio all'avvio.
async function bootstrap() {
  for (const d of seedDocs) {
    const doc = addDoc(d)
    await indexDoc(doc)
  }
  app.listen(PORT, () => {
    console.log(`\n  Agriturismo Zàgara — API su http://localhost:${PORT}`)
    console.log(`  OpenAI: ${hasKey ? 'attivo (RAG + chat LLM)' : 'NESSUNA KEY → fallback ricerca keyword'}\n`)
  })
}

bootstrap()
