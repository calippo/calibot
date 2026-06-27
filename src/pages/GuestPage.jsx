import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import Chat from '../components/Chat.jsx'
import { api } from '../api.js'

const HIGHLIGHTS = [
  'Camere vista Etna',
  'Colazione contadina',
  'Cucina a km zero',
  'Piscina stagionale',
  'Noleggio e-bike',
  'Pet friendly',
]

export default function GuestPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.getConfig().then(setData).catch(() => setData({ config: null }))
  }, [])

  if (!data) return <div className="loading-screen">Carico l’agriturismo…</div>
  const { config, hasKey } = data

  return (
    <div className="guest">
      <TopBar name={config.name} link={{ to: '/admin', label: 'Area gestore' }} />
      <div className="guest-grid">
        <section className="info">
          <p className="eyebrow">Agriturismo · Sicilia</p>
          <h1>{config.name}</h1>
          <p className="tagline">{config.tagline}</p>
          <p className="location">📍 {config.location}</p>
          <p className="description">{config.description}</p>
          <div className="chips">
            {HIGHLIGHTS.map((h) => (
              <span key={h} className="chip">
                {h}
              </span>
            ))}
          </div>
          <div className="contact-card">
            <strong>Contatti</strong>
            {config.contact}
          </div>
        </section>

        <Chat config={config} hasKey={hasKey} />
      </div>
    </div>
  )
}
