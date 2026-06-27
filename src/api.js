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

export const api = {
  getConfig: () => req('/config'),
  updateConfig: (patch) => req('/config', { method: 'PUT', body: JSON.stringify(patch) }),
  listDocs: () => req('/docs'),
  getDoc: (id) => req(`/docs/${id}`),
  addDoc: (doc) => req('/docs', { method: 'POST', body: JSON.stringify(doc) }),
  deleteDoc: (id) => req(`/docs/${id}`, { method: 'DELETE' }),

  // Chat ospiti (richiede il codice di accesso).
  checkAccess: (code) => req('/access-check', { method: 'POST', body: JSON.stringify({ code }) }),
  chat: (messages, accessCode) =>
    req('/chat', {
      method: 'POST',
      headers: { 'x-access-code': accessCode || '' },
      body: JSON.stringify({ messages }),
    }),

  // Area gestore (richiede la password).
  getAccessCode: (password) =>
    req('/admin/access-code', { headers: { 'x-admin-password': password } }),
  regenerateAccessCode: (password) =>
    req('/admin/access-code', { method: 'POST', headers: { 'x-admin-password': password } }),
}
