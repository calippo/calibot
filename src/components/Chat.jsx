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

  // Codice di accesso ospiti.
  const [code, setCode] = useState(() => sessionStorage.getItem('zagara_access') || '')
  const [unlocked, setUnlocked] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState('')

  // All'avvio, se c'è un codice salvato lo verifichiamo.
  useEffect(() => {
    if (!code) return
    api
      .checkAccess(code)
      .then(({ ok }) => {
        if (ok) setUnlocked(true)
        else {
          sessionStorage.removeItem('zagara_access')
          setCode('')
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  async function unlock(e) {
    e.preventDefault()
    const value = codeInput.trim().toUpperCase()
    if (!value) return
    try {
      const { ok } = await api.checkAccess(value)
      if (ok) {
        sessionStorage.setItem('zagara_access', value)
        setCode(value)
        setUnlocked(true)
        setCodeError('')
      } else {
        setCodeError('Codice non valido. Chiedilo alla reception.')
      }
    } catch (err) {
      setCodeError(err.message)
    }
  }

  async function send(text) {
    const content = (text ?? input).trim()
    if (!content || busy) return
    setInput('')
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setBusy(true)
    try {
      const history = next.map(({ role, content }) => ({ role, content }))
      const { reply, sources } = await api.chat(history, code)
      setMessages([...next, { role: 'assistant', content: reply, sources }])
    } catch (err) {
      if (err.status === 401) {
        // Il codice è stato rigenerato dal gestore: richiediamolo.
        sessionStorage.removeItem('zagara_access')
        setCode('')
        setUnlocked(false)
        setCodeError('Il codice di accesso è cambiato. Inseriscine uno nuovo.')
        return
      }
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

      {!unlocked ? (
        <div className="chat-gate">
          <form className="chat-gate-card" onSubmit={unlock}>
            <h3>Accesso riservato agli ospiti</h3>
            <p>Inserisci il codice che trovi in camera o che ti ha dato la reception.</p>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="ES. K7M2PQ"
              maxLength={12}
              autoFocus
              aria-label="Codice di accesso"
            />
            {codeError && <div className="gate-error">{codeError}</div>}
            <button className="btn" type="submit">
              Entra nella chat
            </button>
          </form>
        </div>
      ) : (
        <>
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
        </>
      )}
    </section>
  )
}
