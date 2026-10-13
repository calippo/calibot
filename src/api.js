// Piccolo client per le API del backend.
async function req(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error || `Errore ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// Password del gestore, inserita al login e tenuta solo per la sessione del browser.
const ADMIN_PW_KEY = 'zagara_admin_pw'
export const adminSession = {
  get: () => sessionStorage.getItem(ADMIN_PW_KEY) || '',
  set: (pw) => sessionStorage.setItem(ADMIN_PW_KEY, pw),
  clear: () => sessionStorage.removeItem(ADMIN_PW_KEY),
}
const admin = () => ({ 'x-admin-password': adminSession.get() })

export const api = {
  getConfig: () => req('/config'),
  updateConfig: (patch) =>
    req('/config', { method: 'PUT', headers: admin(), body: JSON.stringify(patch) }),
  listDocs: () => req('/docs'),
  getDoc: (id) => req(`/docs/${id}`),
  addDoc: (doc) => req('/docs', { method: 'POST', headers: admin(), body: JSON.stringify(doc) }),
  deleteDoc: (id) => req(`/docs/${id}`, { method: 'DELETE', headers: admin() }),

  // Chat ospiti (richiede il codice di accesso).
  checkAccess: (code) => req('/access-check', { method: 'POST', body: JSON.stringify({ code }) }),
  chat: (messages, accessCode) =>
    req('/chat', {
      method: 'POST',
      headers: { 'x-access-code': accessCode || '' },
      body: JSON.stringify({ messages }),
    }),

  // Area gestore (richiede la password).
  // Accetta una password esplicita per verificarla al login.
  getAccessCode: (password = adminSession.get()) =>
    req('/admin/access-code', { headers: { 'x-admin-password': password } }),
  regenerateAccessCode: () => req('/admin/access-code', { method: 'POST', headers: admin() }),
}
