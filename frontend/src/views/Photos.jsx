import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { t } from '../lib/i18n.js'
import { dateFromFile, listPhotos, savePhoto, movePhoto, deletePhoto, photoUrl } from '../lib/progress-photos.js'
import { Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

export default function Photos() {
  const nav = useNavigate()
  const [rows, setRows] = useState([])
  const [pick, setPick] = useState([])
  const [slider, setSlider] = useState(50)
  const [cam, setCam] = useState(false)
  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const reload = () => listPhotos().then(setRows).catch(() => setRows([]))
  useEffect(() => { reload() }, [])

  const addFile = async file => {
    const buf = await file.arrayBuffer()
    const d = dateFromFile(buf, file.name, file.lastModified)
    await savePhoto({ blob: new Blob([buf], { type: file.type || 'image/jpeg' }), d, name: file.name })
    reload()
  }

  const months = []
  for (const row of rows) {
    const key = (row.d || '').slice(0, 7)
    let g = months.find(m => m.key === key)
    if (!g) { g = { key, rows: [] }; months.push(g) }
    g.rows.push(row)
  }
  const chosen = pick.map(id => rows.find(r => r.id === id)).filter(Boolean)
  const prev = rows[1] || rows[0]

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" aria-label={t('Back')} onClick={() => nav('/settings')}><Icon name="chevronLeft" /></button>
      <div><h1>{t('Progress photos')}</h1><div className="sub">{t('Kept on this device.')}</div></div>
    </div>
    <div className="row" style={{ gap: 8, marginBottom: 12 }}>
      <Button onClick={() => fileRef.current?.click()}>{t('Add photo')}</Button>
      <Button variant="ghost" onClick={() => setCam(true)}>{t('Camera')}</Button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) addFile(f); e.target.value = '' }} />
    </div>
    {chosen.length >= 2 && <Compare rows={chosen} slider={slider} setSlider={setSlider} />}
    {months.map(m => <div key={m.key} style={{ marginBottom: 16 }}>
      <div className="small muted" style={{ marginBottom: 6 }}>{m.key}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {m.rows.map(row => <PhotoTile key={row.id} row={row} on={pick.includes(row.id)} onPick={() => setPick(p => p.includes(row.id) ? p.filter(x => x !== row.id) : (p.length >= 9 ? p : [...p, row.id]))} onMove={d => movePhoto(row.id, d).then(reload)} onDelete={() => deletePhoto(row.id).then(reload)} />)}
      </div>
    </div>)}
    {!rows.length && <p className="muted">{t('No photos yet.')}</p>}
    {cam && <Camera previous={prev} onClose={() => setCam(false)} onShot={async blob => { await savePhoto({ blob, d: new Date().toISOString().slice(0, 10) }); setCam(false); reload() }} />}
  </div>
}

function PhotoTile({ row, on, onPick, onMove, onDelete }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const u = photoUrl(row)
    setUrl(u)
    return () => { if (u) URL.revokeObjectURL(u) }
  }, [row])
  return <button type="button" onClick={onPick} style={{ padding: 0, border: on ? '2px solid var(--acc)' : '2px solid transparent', borderRadius: 8, background: 'none' }}>
    {url && <img src={url} alt="" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 6, display: 'block' }} />}
    <div className="small" style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
      <input className="input" value={row.d} onClick={e => e.stopPropagation()} onChange={e => onMove(e.target.value)} style={{ fontSize: 11, padding: 2 }} />
      <span onClick={e => { e.stopPropagation(); onDelete() }} aria-label="delete">×</span>
    </div>
  </button>
}

function Compare({ rows, slider, setSlider }) {
  const urls = rows.map(r => photoUrl(r))
  useEffect(() => () => urls.forEach(u => u && URL.revokeObjectURL(u)), [rows])
  if (rows.length === 2) {
    return <div style={{ position: 'relative', marginBottom: 12 }}>
      <img src={urls[0]} alt="" style={{ width: '100%', display: 'block' }} />
      <img src={urls[1]} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', clipPath: `inset(0 0 0 ${slider}%)` }} />
      <input type="range" min="0" max="100" value={slider} onChange={e => setSlider(Number(e.target.value))} style={{ width: '100%' }} />
    </div>
  }
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 12 }}>
    {urls.map((u, i) => <img key={rows[i].id} src={u} alt="" style={{ width: '100%' }} />)}
  </div>
}

function Camera({ previous, onClose, onShot }) {
  const videoRef = useRef(null)
  const [ghost, setGhost] = useState(0.35)
  const prevUrl = previous ? photoUrl(previous) : ''
  useEffect(() => {
    let stream
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } }).then(s => {
      stream = s
      if (videoRef.current) videoRef.current.srcObject = s
    }).catch(() => {})
    return () => { stream?.getTracks().forEach(t => t.stop()); if (prevUrl) URL.revokeObjectURL(prevUrl) }
  }, [])
  const shoot = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 720
    canvas.height = video.videoHeight || 960
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => { if (blob) onShot(blob) }, 'image/jpeg', 0.85)
  }
  return <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 40 }}>
    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    {prevUrl && <img src={prevUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: ghost, pointerEvents: 'none' }} />}
    <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
      <Button variant="ghost" onClick={onClose}>{t('Close')}</Button>
      <input type="range" min="0" max="80" value={ghost * 100} onChange={e => setGhost(Number(e.target.value) / 100)} />
      <Button variant="primary" onClick={shoot}>{t('Take photo')}</Button>
    </div>
  </div>
}
