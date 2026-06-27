import { Link } from 'react-router-dom'

export default function TopBar({ name, link }) {
  return (
    <>
      <header className="topbar">
        <div className="brandmark">
          <span className="dot" />
          {name}
        </div>
        <Link className="nav-link" to={link.to}>
          {link.label}
        </Link>
      </header>
      <div className="tile-band" />
    </>
  )
}
