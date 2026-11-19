// Progress photos stay on this device. The bytes live in IndexedDB, never in the synced
// profile, so a backup of the workout log does not carry the pictures with it.

const DB = 'opengym-photos'
const STORE = 'photos'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const out = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(out?.result)
    t.onerror = () => reject(t.error)
  })
}

/** A date written into the file itself: EXIF "YYYY:MM:DD", else a name, else the file's own date. */
export function dateFromFile(buf, name, fileDate) {
  let text = ''
  try { text = new TextDecoder('latin1').decode(buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf) } catch { text = '' }
  const exif = text.match(/(20\d{2}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})/)
  if (exif) return `${exif[1]}-${exif[2]}-${exif[3]}`
  const named = String(name || '').match(/(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})/)
  if (named) return `${named[1]}-${named[2]}-${named[3]}`
  const d = fileDate ? new Date(fileDate) : new Date()
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export async function listPhotos() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll()
    req.onsuccess = () => {
      const rows = (req.result || []).slice().sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : b.t - a.t))
      resolve(rows)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function savePhoto({ blob, d, name }) {
  const db = await openDb()
  const row = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), d, t: Date.now(), name: name || '', blob }
  await tx(db, 'readwrite', store => store.put(row))
  return row
}

export async function movePhoto(id, d) {
  const db = await openDb()
  const storeName = STORE
  await new Promise((resolve, reject) => {
    const t = db.transaction(storeName, 'readwrite')
    const store = t.objectStore(storeName)
    const get = store.get(id)
    get.onsuccess = () => {
      if (get.result) store.put({ ...get.result, d })
    }
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export async function deletePhoto(id) {
  const db = await openDb()
  await tx(db, 'readwrite', store => store.delete(id))
}

export function photoUrl(row) {
  if (!row?.blob) return ''
  return URL.createObjectURL(row.blob)
}
