import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import Chat from '../components/Chat.jsx'
import { api } from '../api.js'

const OVERLAY =
  'linear-gradient(180deg, rgba(250,243,230,0.95) 0%, rgba(250,243,230,0.86) 38%, rgba(242,230,207,0.74) 100%)'

export default function GuestPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.getConfig().then(setData).catch(() => setData({ config: null }))
  }, [])

  if (!data) return <div className="loading-screen">Carico l’agriturismo…</div>
  const { config, hasKey } = data

  const bgUrl = config.backgroundImage || '/etna.jpg'
  const infoStyle = {
    background: `${OVERLAY}, url(${JSON.stringify(bgUrl)}) center / cover no-repeat`,
  }
  const services = config.services || []

  return (
    <div className="guest">
      <TopBar
        name={config.name}
        logo={config.logo}
        link={{ to: '/admin', label: 'Area gestore' }}
      />
      <div className="guest-grid">
        <section className="info" style={infoStyle}>
          <p className="eyebrow">Agriturismo · Sicilia</p>
          {config.logo ? (
            <img className="hero-logo" src={config.logo} alt={config.name} />
          ) : (
            <h1>{config.name}</h1>
          )}
          <p className="tagline">{config.tagline}</p>
          <p className="location">📍 {config.location}</p>
          <p className="description">{config.description}</p>
          {services.length > 0 && (
            <div className="chips">
              {services.map((s, i) => (
                <span key={i} className="chip">
                  {s}
                </span>
              ))}
            </div>
          )}
          <div className="contact-card">
            <strong>Contatti</strong>
            {config.contact}
          </div>
        </section>

        <Chat config={config} hasKey={hasKey} />
      </div>

      {config.funding && <footer className="funding">{config.funding}</footer>}
    </div>
  )
}
