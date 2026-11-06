// One front-view figure. The blue ring is the tape for the measurement being asked.
// Drawn here on purpose: pictures of how to measure are not ours to ship.
// Left and right are the person's own left and right, so on a front view the
// left limbs sit on the right side of the picture.

const TAPES = {
  neck: { cx: 110, cy: 56, rx: 14, ry: 6 },
  shoulders: { cx: 110, cy: 84, rx: 56, ry: 8 },
  chest: { cx: 110, cy: 122, rx: 44, ry: 8 },
  waist: { cx: 110, cy: 164, rx: 30, ry: 7 },
  abdomen: { cx: 110, cy: 182, rx: 34, ry: 7 },
  hips: { cx: 110, cy: 206, rx: 44, ry: 8 },
  upperArmLeft: { cx: 164, cy: 122, rx: 15, ry: 7, rotate: -20 },
  upperArmRight: { cx: 56, cy: 122, rx: 15, ry: 7, rotate: 20 },
  forearmLeft: { cx: 186, cy: 168, rx: 11, ry: 6, rotate: -12 },
  forearmRight: { cx: 34, cy: 168, rx: 11, ry: 6, rotate: 12 },
  wristLeft: { cx: 192, cy: 196, rx: 9, ry: 5, rotate: -8 },
  wristRight: { cx: 28, cy: 196, rx: 9, ry: 5, rotate: 8 },
  thighLeft: { cx: 138, cy: 252, rx: 18, ry: 7 },
  thighRight: { cx: 82, cy: 252, rx: 18, ry: 7 },
  calfLeft: { cx: 142, cy: 296, rx: 13, ry: 6 },
  calfRight: { cx: 78, cy: 296, rx: 13, ry: 6 },
  ankleLeft: { cx: 144, cy: 322, rx: 10, ry: 5 },
  ankleRight: { cx: 76, cy: 322, rx: 10, ry: 5 },
}

function Tape({ cx, cy, rx, ry, rotate = 0 }) {
  return (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#0a84ff" strokeWidth="3.2"
      transform={rotate ? `rotate(${rotate} ${cx} ${cy})` : undefined} />
  )
}

export default function MeasureFigure({ part }) {
  const tape = TAPES[part]
  return (
    <div className="measure-fig" aria-hidden="true">
      <svg viewBox="0 0 220 340">
        <g fill="#ffffff" stroke="#d5dbe3" strokeWidth="1.4" strokeLinejoin="round">
          <circle cx="110" cy="30" r="16" />
          <rect x="100" y="42" width="20" height="40" rx="8" />
          <path d="M54 78
            Q110 66 166 78
            L172 116
            Q176 140 152 156
            Q140 166 134 176
            L160 198
            Q170 216 142 220
            L110 224
            L78 220
            Q50 216 60 198
            L86 176
            Q80 166 68 156
            Q44 140 48 116
            Z" />
          <path d="M166 86 Q190 108 186 150 Q184 168 172 166 Q176 130 156 100 Z" />
          <path d="M54 86 Q30 108 34 150 Q36 168 48 166 Q44 130 64 100 Z" />
          <path d="M172 160 Q198 176 196 206 Q194 214 184 210 Q188 184 164 168 Z" />
          <path d="M48 160 Q22 176 24 206 Q26 214 36 210 Q32 184 56 168 Z" />
          <path d="M86 216 C74 250 70 290 74 328 L98 328 C100 292 102 252 108 220 Z" />
          <path d="M134 216 C146 250 150 290 146 328 L122 328 C120 292 118 252 112 220 Z" />
        </g>
        {tape && <Tape {...tape} />}
      </svg>
    </div>
  )
}
