import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { api } from '../api.js'

const SUGGESTIONS = [
  'A che ora è la colazione?',
  'Cosa posso visitare sull’Etna?',
  'Accettate animali?',
  'Come arrivo da Catania?',
]

export default function Chat({ config, hasKey }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: config.welcome, sources: [] },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  async function send(text) {
    const content = (text ?? input).trim()
    if (!content || busy) return
    setInput('')
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setBusy(true)
    try {
      const history = next.map(({ role, content }) => ({ role, content }))
      const { reply, sources } = await api.chat(history)
      setMessages([...next, { role: 'assistant', content: reply, sources }])
    } catch (err) {
      setMessages([
        ...next,
        {
          role: 'assistant',
          content: `Scusa, ho avuto un problema: ${err.message}. Riprova tra poco.`,
          sources: [],
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="chat">
      <div className="chat-head">
        <h2>Assistente di {config.name}</h2>
        <p>Servizi, orari e consigli sulla zona — 24 ore su 24.</p>
        <span className={`status-pill ${hasKey ? '' : 'off'}`}>
          <span className="led" />
          {hasKey ? 'Assistente AI attivo' : 'Modalità ricerca (nessuna API key)'}
        </span>
      </div>

      <div className="messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'assistant' ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
            {m.sources?.length > 0 && (
              <div className="sources">
                {m.sources.map((s) => (
                  <span key={s.id} className="source-chip">
                    {s.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="msg assistant">
            <span className="typing">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="suggestion" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrivi un messaggio…"
          aria-label="Messaggio"
        />
        <button className="btn" type="submit" disabled={busy || !input.trim()}>
          Invia
        </button>
      </form>
    </section>
  )
}
