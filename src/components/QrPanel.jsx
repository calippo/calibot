import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// QR code della pagina ospiti, da stampare e lasciare in camera.
export default function QrPanel({ accessCode, name }) {
  const [withCode, setWithCode] = useState(false)
  const [img, setImg] = useState('')

  const url = `${window.location.origin}/${withCode && accessCode ? `?code=${accessCode}` : ''}`

  useEffect(() => {
    QRCode.toDataURL(url, { width: 600, margin: 2 }).then(setImg).catch(() => setImg(''))
  }, [url])

  const fileName = `qr-${(name || 'assistente').trim().replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.png`

  return (
    <div className="panel">
      <h2>QR code per le camere</h2>
      <p className="hint">
        Stampa questo QR e lascialo in camera: apre la pagina ospiti con l’assistente.
        L’indirizzo è fisso, quindi il QR resta valido anche dopo aggiornamenti e riavvii.
      </p>
      <div className="qr-row">
        {img && <img className="qr-img" src={img} alt={`QR code per ${url}`} />}
        <div className="qr-side">
          <code className="qr-url">{url}</code>
          <label className="check">
            <input
              type="checkbox"
              checked={withCode}
              onChange={(e) => setWithCode(e.target.checked)}
            />
            Includi il codice di accesso (gli ospiti entrano senza digitarlo)
          </label>
          {withCode && (
            <p className="spec">
              Se rigeneri il codice, i QR stampati con il codice vecchio smettono di
              funzionare: andranno ristampati.
            </p>
          )}
          {img && (
            <a className="btn ghost small" href={img} download={fileName}>
              Scarica PNG
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
