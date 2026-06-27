// Piccolo client per le API del backend.
async function req(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Errore ${res.status}`)
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
  chat: (messages) => req('/chat', { method: 'POST', body: JSON.stringify({ messages }) }),
}
