import { useEffect, useId, useState } from 'react'
import { tapeFor } from '../lib/measure-outline.js'

// The same front view the muscle map draws. The body is one outline, and the
// muscles stay inside it, drawn pale, so the tape can be read against them.
// Left and right are the person's own left and right.

let CACHE = null
let PENDING = null

function useBodyPaths() {
  const [paths, setPaths] = useState(CACHE)
  useEffect(() => {
    if (CACHE) return
    let alive = true
    PENDING = PENDING || import('../lib/body-paths.js').then(m => (CACHE = m.default))
    PENDING.then(p => { if (alive) setPaths(p) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return paths
}

export default function MeasureFigure({ part, body = 'male' }) {
  const paths = useBodyPaths()
  const uid = useId().replace(/:/g, '')
  const sex = body === 'female' ? 'female' : 'male'
  const front = paths?.[sex]?.front
  const tape = front ? tapeFor(front, part) : null
  const shapes = front
    ? Object.entries(front.p).flatMap(([slug, list]) => list.map((d, i) => ({
      key: slug + i,
      d,
      clip: front.c?.[slug]?.[i] ? `url(#${uid}-${slug}-${i})` : undefined,
    })))
    : []
  const clips = []
  if (front?.c) {
    for (const slug of Object.keys(front.c)) {
      front.c[slug].forEach((box, i) => {
        const [x, y, w, h] = box
        clips.push(<clipPath id={`${uid}-${slug}-${i}`} key={slug + i}><rect x={x} y={y} width={w} height={h} /></clipPath>)
      })
    }
  }
  return (
    <div className="measure-fig" aria-hidden="true">
      <svg viewBox={front?.vb || (sex === 'female' ? '0 0 650 1450' : '0 95 727 1280')}>
        {front ? <>
          <defs>
            {clips}
            <filter id={`${uid}-edge`} x="-12%" y="-12%" width="124%" height="124%">
              <feMorphology in="SourceAlpha" operator="dilate" radius="9" result="outer" />
              <feComposite in="outer" in2="SourceAlpha" operator="out" result="rim" />
              <feFlood floodColor="#8e98a6" result="gray" />
              <feComposite in="gray" in2="rim" operator="in" result="stroke" />
              <feMerge>
                <feMergeNode in="stroke" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g fill="#fbfcfd" stroke="#fbfcfd" strokeWidth="10" strokeLinejoin="round" filter={`url(#${uid}-edge)`}>
            {shapes.map(shape => <path key={shape.key} d={shape.d} clipPath={shape.clip} />)}
          </g>
          <g fill="none" stroke="#c2b9cf" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round">
            {shapes.map(shape => <path key={shape.key} d={shape.d} clipPath={shape.clip} />)}
          </g>
        </> : null}
        {tape ? (
          <ellipse
            cx={tape.cx} cy={tape.cy} rx={tape.rx} ry={Math.max(tape.ry, 8)}
            fill="none" stroke="#0a84ff" strokeWidth="8"
            transform={tape.rotate ? `rotate(${tape.rotate} ${tape.cx} ${tape.cy})` : undefined}
          />
        ) : null}
      </svg>
    </div>
  )
}
