const BASE = '/AdoptionService'

async function checkResponse(r) {
  if (!r.ok) {
    let msg = `HTTP ${r.status}`
    try { const j = await r.json(); msg = j?.error?.message || j?.message || msg } catch {}
    throw new Error(msg)
  }
  return r
}

export async function apiGet(path) {
  const r = await checkResponse(await fetch(`${BASE}${path}`))
  const d = await r.json()
  return d.value ?? d
}

export async function apiPost(path, body) {
  const r = await checkResponse(await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }))
  return r.json()
}

export async function apiPatch(path, body) {
  const r = await checkResponse(await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }))
  return r.status === 204 ? null : r.json()
}
