import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  getConfig,
  updateConfig,
  listDocs,
  getDoc,
  addDoc,
  removeDoc,
  getAccessCode,
  regenerateAccessCode,
} from './store.js'
import { indexDoc, chat, hasKey } from './rag.js'
import { seedDocs } from './seed.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '12mb' })) // immagini logo/sfondo arrivano come data URL

const PORT = process.env.PORT || 3001
// Password area gestore (deve combaciare con quella del frontend).
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'reportaid123!'

// Protegge gli endpoint riservati al gestore.
function requireAdmin(req, res, next) {
  if (req.get('x-admin-password') !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorizzato' })
  }
  next()
}

// --- Config ---
app.get('/api/config', (_req, res) => {
  res.json({ config: getConfig(), hasKey })
})

app.put('/api/config', (req, res) => {
  const allowed = [
    'name',
    'tagline',
    'location',
    'description',
    'contact',
    'welcome',
    'logo',
    'backgroundImage',
    'services',
    'funding',
  ]
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

// --- Codice di accesso ospiti ---
app.post('/api/access-check', (req, res) => {
  const code = (req.body?.code || '').trim().toUpperCase()
  res.json({ ok: !!code && code === getAccessCode() })
})

app.get('/api/admin/access-code', requireAdmin, (_req, res) => {
  res.json({ code: getAccessCode() })
})

app.post('/api/admin/access-code', requireAdmin, (_req, res) => {
  res.json({ code: regenerateAccessCode() })
})

// --- Chat ---
app.post('/api/chat', async (req, res) => {
  const code = (req.get('x-access-code') || '').trim().toUpperCase()
  if (code !== getAccessCode()) {
    return res.status(401).json({ error: 'Codice di accesso non valido' })
  }
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

// In produzione Express serve anche il frontend buildato (un solo servizio).
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  // Fallback SPA: ogni rotta non-API restituisce index.html (per /admin ecc.)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Indicizza i documenti di esempio all'avvio.
async function bootstrap() {
  for (const d of seedDocs) {
    const doc = addDoc(d)
    await indexDoc(doc)
  }
  app.listen(PORT, () => {
    console.log(`\n  Agriturismo Zàgara — API su http://localhost:${PORT}`)
    console.log(`  OpenAI: ${hasKey ? 'attivo (RAG + chat LLM)' : 'NESSUNA KEY → fallback ricerca keyword'}`)
    console.log(`  Codice di accesso ospiti: ${getAccessCode()} (rigenerabile dall'area gestore)\n`)
  })
}

bootstrap()
