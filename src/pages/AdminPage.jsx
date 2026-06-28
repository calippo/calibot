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
  const [accessCode, setAccessCode] = useState('')
  const [regenerating, setRegenerating] = useState(false)

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
    api
      .getAccessCode(ADMIN_PASSWORD)
      .then((d) => setAccessCode(d.code))
      .catch(() => {})
  }, [])

  async function regenerate() {
    if (
      !window.confirm(
        'Rigenerare il codice? Il codice attuale smetterà subito di funzionare e gli ospiti dovranno usare quello nuovo.',
      )
    )
      return
    setRegenerating(true)
    try {
      const d = await api.regenerateAccessCode(ADMIN_PASSWORD)
      setAccessCode(d.code)
    } catch (err) {
      setError(err.message)
    } finally {
      setRegenerating(false)
    }
  }

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

  async function download(doc) {
    try {
      const { doc: full } = await api.getDoc(doc.id)
      const blob = new Blob([full.content], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(full.title || 'documento').trim().replace(/[\\/:*?"<>|]+/g, '-')}.md`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = reject
      r.readAsDataURL(file)
    })
  }

  async function pickImage(e, key, maxMB) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) {
      setError('Carica un file immagine.')
      e.target.value = ''
      return
    }
    if (file.size > maxMB * 1024 * 1024) {
      setError(`L’immagine supera ${maxMB} MB: usa un file più leggero.`)
      e.target.value = ''
      return
    }
    setConfig({ ...config, [key]: await readFileAsDataURL(file) })
    e.target.value = ''
  }

  function setService(i, val) {
    const s = [...(config.services || [])]
    s[i] = val
    setConfig({ ...config, services: s })
  }
  function addService() {
    setConfig({ ...config, services: [...(config.services || []), ''] })
  }
  function removeService(i) {
    setConfig({ ...config, services: (config.services || []).filter((_, j) => j !== i) })
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

        {/* --- Configurazione (un solo salvataggio per tutto) --- */}
        <form onSubmit={saveConfig}>
          <div className="panel">
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
          </div>

          {/* Logo e sfondo */}
          <div className="panel">
            <h2>Logo e immagine di sfondo</h2>
            <p className="hint">
              Se non carichi un logo, viene mostrato il nome della struttura come testo.
            </p>

            <div className="row">
              <div className="field">
                <label>Logo</label>
                <div className="img-control">
                  {config.logo ? (
                    <img className="img-preview logo" src={config.logo} alt="Logo" />
                  ) : (
                    <div className="img-placeholder">Nessun logo — si usa il nome testuale</div>
                  )}
                  <div className="img-buttons">
                    <label className="btn ghost small" style={{ cursor: 'pointer' }}>
                      {config.logo ? 'Cambia logo' : 'Carica logo'}
                      <input
                        type="file"
                        accept="image/png,image/svg+xml,image/webp,image/jpeg"
                        onChange={(e) => pickImage(e, 'logo', 1)}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {config.logo && (
                      <button
                        type="button"
                        className="btn danger small"
                        onClick={() => setConfig({ ...config, logo: '' })}
                      >
                        Rimuovi
                      </button>
                    )}
                  </div>
                </div>
                <p className="spec">
                  PNG o SVG con sfondo trasparente · orizzontale · ~400×120 px
                  (max 600×200) · peso &lt; 1 MB
                </p>
              </div>

              <div className="field">
                <label>Immagine di sfondo</label>
                <div className="img-control">
                  <img
                    className="img-preview bg"
                    src={config.backgroundImage || '/etna.jpg'}
                    alt="Sfondo"
                  />
                  <div className="img-buttons">
                    <label className="btn ghost small" style={{ cursor: 'pointer' }}>
                      Cambia sfondo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => pickImage(e, 'backgroundImage', 3)}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {config.backgroundImage && (
                      <button
                        type="button"
                        className="btn danger small"
                        onClick={() => setConfig({ ...config, backgroundImage: '' })}
                      >
                        Ripristina default
                      </button>
                    )}
                  </div>
                </div>
                <p className="spec">
                  JPG orizzontale · almeno 1600×1000 px (consigliato 1920×1280, formato
                  3:2) · peso &lt; 3 MB
                </p>
              </div>
            </div>
          </div>

          {/* Servizi in evidenza */}
          <div className="panel">
            <h2>Servizi in evidenza</h2>
            <p className="hint">
              Le etichette mostrate sotto la descrizione (es. “Noleggio e-bike”).
            </p>
            <div className="service-list">
              {(config.services || []).map((s, i) => (
                <div className="service-row" key={i}>
                  <input
                    value={s}
                    onChange={(e) => setService(i, e.target.value)}
                    placeholder="Es. Noleggio e-bike"
                  />
                  <button
                    type="button"
                    className="btn danger small"
                    onClick={() => removeService(i)}
                  >
                    Rimuovi
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn ghost small" onClick={addService}>
              + Aggiungi servizio
            </button>
          </div>

          {/* Finanziamento */}
          <div className="panel">
            <h2>Informazioni sul finanziamento</h2>
            <p className="hint">
              Testo mostrato in fondo alla pagina ospiti, in caratteri piccoli (requisito
              tipico dei bandi). Lascia vuoto per nasconderlo.
            </p>
            <div className="field">
              <textarea
                style={{ minHeight: 90, fontFamily: 'var(--body)', fontSize: '0.9rem' }}
                placeholder="Es. Progetto finanziato nell’ambito di… — CUP …"
                {...field('funding')}
              />
            </div>
          </div>

          <div className="actions sticky-save">
            <button className="btn" type="submit">
              Salva modifiche
            </button>
            {savedAt && <span className="saved-note">✓ Salvato</span>}
          </div>
        </form>

        {/* --- Codice di accesso --- */}
        <div className="panel">
          <h2>Codice di accesso ospiti</h2>
          <p className="hint">
            Gli ospiti devono inserire questo codice per usare la chat. Condividilo al
            check-in o lascialo in camera. Rigeneralo quando vuoi revocare l’accesso.
          </p>
          <div className="code-row">
            <code className="access-code">{accessCode || '······'}</code>
            <button className="btn ghost small" onClick={regenerate} disabled={regenerating}>
              {regenerating ? 'Rigenero…' : 'Rigenera codice'}
            </button>
          </div>
        </div>

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
                  <div className="doc-actions">
                    <button className="btn ghost small" onClick={() => download(d)}>
                      Scarica
                    </button>
                    <button className="btn danger small" onClick={() => remove(d.id)}>
                      Elimina
                    </button>
                  </div>
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
