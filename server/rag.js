// RAG in-memory: chunking, embedding (OpenAI) e retrieval con fallback keyword.
import OpenAI from 'openai'
import { getChunks, setChunksForDoc, getConfig } from './store.js'

const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-3-small'
const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini'

export const hasKey = Boolean(process.env.OPENAI_API_KEY)
const openai = hasKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

// Spezza il markdown in chunk ~900 caratteri rispettando i paragrafi.
export function chunkText(text, size = 900, overlap = 150) {
  const clean = text.replace(/\r\n/g, '\n').trim()
  if (!clean) return []
  const paras = clean.split(/\n{2,}/)
  const chunks = []
  let buf = ''
  for (const p of paras) {
    if ((buf + '\n\n' + p).length > size && buf) {
      chunks.push(buf.trim())
      buf = buf.slice(Math.max(0, buf.length - overlap))
    }
    buf += (buf ? '\n\n' : '') + p
  }
  if (buf.trim()) chunks.push(buf.trim())
  // Spezza eventuali paragrafi monolitici più lunghi di `size`.
  return chunks.flatMap((c) =>
    c.length <= size * 1.5
      ? [c]
      : c.match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')) || [c],
  )
}

async function embed(texts) {
  const res = await openai.embeddings.create({ model: EMBED_MODEL, input: texts })
  return res.data.map((d) => d.embedding)
}

// Indicizza un documento: crea i chunk e (se c'è la key) gli embedding.
export async function indexDoc(doc) {
  const pieces = chunkText(doc.content)
  let embeddings = pieces.map(() => null)
  if (hasKey && pieces.length) {
    try {
      embeddings = await embed(pieces)
    } catch (err) {
      console.warn('[rag] embedding fallito, uso fallback keyword:', err.message)
    }
  }
  const chunks = pieces.map((text, i) => ({
    id: `${doc.id}:${i}`,
    docId: doc.id,
    title: doc.title,
    text,
    embedding: embeddings[i],
  }))
  setChunksForDoc(doc.id, chunks)
  return chunks.length
}

function cosine(a, b) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

function keywordScore(text, query) {
  const terms = query.toLowerCase().match(/\p{L}+/gu) || []
  const hay = text.toLowerCase()
  let score = 0
  for (const t of terms) {
    if (t.length < 3) continue
    if (hay.includes(t)) score += 1
  }
  return score
}

// Recupera i chunk più rilevanti per la domanda.
export async function retrieve(query, k = 5) {
  const chunks = getChunks()
  if (!chunks.length) return []

  const withEmbeddings = chunks.filter((c) => c.embedding)
  if (hasKey && withEmbeddings.length) {
    try {
      const [q] = await embed([query])
      return withEmbeddings
        .map((c) => ({ ...c, score: cosine(q, c.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
    } catch (err) {
      console.warn('[rag] retrieval embedding fallito, uso keyword:', err.message)
    }
  }

  // Fallback: ricerca per parole chiave.
  return chunks
    .map((c) => ({ ...c, score: keywordScore(c.text, query) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

function buildSystemPrompt(config, context) {
  return `Sei l'assistente virtuale di "${config.name}", ${config.location}.
${config.description}

PERSONALITÀ: sei caloroso, ospitale e diretto, come un padrone di casa siciliano. Dai del tu, sei conciso e concreto. Non inventi mai informazioni: usi solo ciò che trovi nel CONTESTO qui sotto. Se l'informazione non c'è, dillo con gentilezza e invita a contattare la struttura (${config.contact}). Rispondi nella lingua dell'ospite (italiano di default).

CONTESTO (informazioni ufficiali della struttura):
${context || '(nessun documento disponibile)'}
`
}

// Genera la risposta della chat a partire dalla cronologia e dai chunk recuperati.
export async function chat(messages) {
  const config = getConfig()
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const hits = lastUser ? await retrieve(lastUser.content) : []

  const context = hits
    .map((h, i) => `[${i + 1}] (${h.title})\n${h.text}`)
    .join('\n\n---\n\n')

  const sources = [...new Map(hits.map((h) => [h.docId, h.title])).entries()].map(
    ([id, title]) => ({ id, title }),
  )

  if (!hasKey) {
    // Senza API key: rispondiamo con i passaggi più rilevanti trovati.
    if (!hits.length) {
      return {
        reply:
          'Per ora non trovo informazioni su questo. Aggiungi documenti dalla pagina admin oppure contatta la struttura.',
        sources: [],
      }
    }
    const reply =
      'Ecco cosa ho trovato nei documenti della struttura:\n\n' +
      hits.map((h) => `**${h.title}**\n\n${h.text}`).join('\n\n') +
      '\n\n_(Modalità senza LLM: imposta `OPENAI_API_KEY` per risposte conversazionali.)_'
    return { reply, sources }
  }

  const res = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.4,
    messages: [
      { role: 'system', content: buildSystemPrompt(config, context) },
      ...messages.slice(-10),
    ],
  })

  return { reply: res.choices[0].message.content, sources }
}
