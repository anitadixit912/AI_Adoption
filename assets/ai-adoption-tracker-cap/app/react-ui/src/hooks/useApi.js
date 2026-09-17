import { useState, useEffect } from 'react'

const BASE = '/AdoptionService'

export function useApi(path, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`${BASE}${path}`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(d => { setData(d.value ?? d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, deps)

  return { data, loading, error }
}

export async function apiGet(path) {
  const r = await fetch(`${BASE}${path}`)
  if (!r.ok) throw new Error(r.statusText)
  const d = await r.json()
  return d.value ?? d
}

export async function apiPost(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!r.ok) throw new Error(r.statusText)
  return r.json()
}

export async function apiPatch(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!r.ok) throw new Error(r.statusText)
  return r.status === 204 ? null : r.json()
}
