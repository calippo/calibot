import { useEffect, useRef, useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import { api } from '../api.js'

// Password dell'area gestore (hardcoded, demo).
const ADMIN_PASSWORD = 'reportaid123!'

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('zagara_admin') === 'ok')
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [config, setConfig] = useState(null)
  const [hasKey, setHasKey] = useState(true)
  const [docs, setDocs] = useState([])
  const [savedAt, setSavedAt] = useState(false)
  const [error, setError] = useState('')

  // form nuovo documento
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [adding, setAdding] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    api.getConfig().then((d) => {
      setConfig(d.config)
      setHasKey(d.hasKey)
    })
    refreshDocs()
  }, [])

  function refreshDocs() {
    api.listDocs().then((d) => setDocs(d.docs))
  }

  async function saveConfig(e) {
    e.preventDefault()
    setError('')
    try {
      await api.updateConfig(config)
      setSavedAt(true)
      setTimeout(() => setSavedAt(false), 2500)
    } catch (err) {
      setError(err.message)
    }
  }

  function field(key) {
    return {
      value: config[key] ?? '',
      onChange: (e) => setConfig({ ...config, [key]: e.target.value }),
    }
  }

  function onPickFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setContent(String(reader.result))
      if (!title) setTitle(file.name.replace(/\.(md|markdown|txt)$/i, ''))
    }
    reader.readAsText(file)
  }

  async function addDoc(e) {
    e.preventDefault()
    setError('')
    if (!content.trim()) {
      setError('Il documento è vuoto.')
      return
    }
    setAdding(true)
    try {
      await api.addDoc({ title, content })
      setTitle('')
      setContent('')
      if (fileRef.current) fileRef.current.value = ''
      refreshDocs()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function remove(id) {
    await api.deleteDoc(id)
    refreshDocs()
  }

  function login(e) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('zagara_admin', 'ok')
      setAuthed(true)
      setPwError('')
    } else {
      setPwError('Password errata. Riprova.')
    }
  }

  function logout() {
    sessionStorage.removeItem('zagara_admin')
    setAuthed(false)
    setPw('')
  }

  if (!authed) {
    return (
      <div className="admin">
        <TopBar name="Zàgara · Gestore" link={{ to: '/', label: 'Vai alla chat' }} />
        <div className="gate">
          <form className="panel gate-card" onSubmit={login}>
            <h2>Area riservata</h2>
            <p className="hint">Inserisci la password del gestore per accedere.</p>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoFocus
              />
            </div>
            {pwError && <div className="banner error">{pwError}</div>}
            <button className="btn" type="submit">
              Entra
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!config) return <div className="loading-screen">Carico la configurazione…</div>

  return (
    <div className="admin">
      <TopBar name="Zàgara · Gestore" link={{ to: '/', label: 'Vai alla chat' }} />
      <div className="admin-body">
        <div className="admin-head">
          <h1>Area gestore</h1>
          <button className="btn ghost small" onClick={logout}>
            Esci
          </button>
        </div>
        <p className="lede">
          Configura la struttura e carica i documenti a cui l’assistente attinge per
          rispondere agli ospiti. Tutto resta in memoria finché il server è acceso.
        </p>

        {!hasKey && (
          <div className="banner warn">
            Nessuna <code>OPENAI_API_KEY</code> impostata: la chat funziona in modalità
            ricerca per parole chiave. Aggiungi la chiave in <code>.env</code> e riavvia il
            server per le risposte conversazionali e il RAG con embedding.
          </div>
        )}
        {error && <div className="banner error">{error}</div>}

        {/* --- Configurazione --- */}
        <form className="panel" onSubmit={saveConfig}>
          <h2>Identità della struttura</h2>
          <p className="hint">Questi dati appaiono nella pagina ospiti e guidano il tono dell’assistente.</p>

          <div className="row">
            <div className="field">
              <label>Nome struttura</label>
              <input {...field('name')} />
            </div>
            <div className="field">
              <label>Slogan</label>
              <input {...field('tagline')} />
            </div>
          </div>

          <div className="field">
            <label>Località</label>
            <input {...field('location')} />
          </div>

          <div className="field">
            <label>Descrizione</label>
            <textarea style={{ minHeight: 100, fontFamily: 'var(--body)', fontSize: '0.95rem' }} {...field('description')} />
          </div>

          <div className="row">
            <div className="field">
              <label>Contatti</label>
              <input {...field('contact')} />
            </div>
            <div className="field">
              <label>Messaggio di benvenuto</label>
              <input {...field('welcome')} />
            </div>
          </div>

          <div className="actions">
            <button className="btn" type="submit">
              Salva modifiche
            </button>
            {savedAt && <span className="saved-note">✓ Salvato</span>}
          </div>
        </form>

        {/* --- Documenti --- */}
        <div className="panel">
          <h2>Base di conoscenza</h2>
          <p className="hint">
            {docs.length} document{docs.length === 1 ? 'o' : 'i'} indicizzat
            {docs.length === 1 ? 'o' : 'i'}. L’assistente cerca qui le risposte.
          </p>

          {docs.length === 0 ? (
            <div className="empty">Nessun documento. Aggiungine uno qui sotto.</div>
          ) : (
            <div className="doc-list">
              {docs.map((d) => (
                <div className="doc-item" key={d.id}>
                  <div className="meta">
                    <strong>{d.title}</strong>
                    <span>{d.chars.toLocaleString('it-IT')} caratteri</span>
                  </div>
                  <button className="btn danger small" onClick={() => remove(d.id)}>
                    Elimina
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addDoc}>
            <div className="upload-zone">
              <label className="btn ghost small" style={{ cursor: 'pointer' }}>
                Carica file .md
                <input
                  ref={fileRef}
                  type="file"
                  accept=".md,.markdown,.txt"
                  onChange={onPickFile}
                  style={{ display: 'none' }}
                />
              </label>
              <span className="hint" style={{ margin: 0 }}>
                …oppure incolla il contenuto qui sotto.
              </span>
            </div>

            <div className="field">
              <label>Titolo</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es. Regolamento piscina"
              />
            </div>
            <div className="field">
              <label>Contenuto (markdown)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Titolo&#10;&#10;Scrivi qui le informazioni in markdown…"
              />
            </div>
            <button className="btn" type="submit" disabled={adding}>
              {adding ? 'Indicizzo…' : 'Aggiungi documento'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
