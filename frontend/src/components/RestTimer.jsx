import { useEffect } from 'react'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { Button } from './ui.jsx'

const clock = sec => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')

// One bar, three moments: the last five seconds of every rest (a big 5-4-3-2-1), the 3-2-1
// before a hold that starts itself, and the work countdown during that hold. They never run
// together — startWork() stops a rest, and the count-in replaces the rest that just ended.
export default function RestTimer() {
  const timer = useUI(s => s.timer)
  const work = useUI(s => s.work)
  const countIn = useUI(s => s.countIn)
  const { addRest, skipRest, finishWorkEarly, stopWork, goNow, stopCountIn } = useUI()
  const on = countIn || work || timer
  // The bar is fixed above the tab bar and floats over whatever is beneath it — during a
  // rest that was the next set's row. Extra bottom padding lets the page scroll clear.
  useEffect(() => {
    document.body.classList.toggle('resting', !!on)
    return () => document.body.classList.remove('resting')
  }, [!!on])
  if (!on) return null

  if (countIn) return (
    <div id="timer" className="countin">
      <div className="head">
        <div className="t" key={countIn.left}>{countIn.left}</div>
        <div className="lbl">{t('Get ready: {0}', countIn.label)}</div>
      </div>
      <div className="acts">
        <Button size="sm" onClick={stopCountIn}>{t('Cancel')}</Button>
        <Button size="sm" variant="primary" onClick={goNow}>{t('Go now')}</Button>
      </div>
    </div>
  )

  if (work) return (
    <div id="timer" className="working">
      <div className="t">{clock(work.left)}</div>
      <div className="grow">
        {work.label && <div className="lbl">{work.label}</div>}
        <div className="bar"><i style={{ width: (work.left / work.total) * 100 + '%' }} /></div>
      </div>
      <Button size="sm" onClick={stopWork}>{t('Cancel')}</Button>
      <Button size="sm" variant="primary" icon="check" onClick={finishWorkEarly}>{t('Done')}</Button>
    </div>
  )
  const finale = timer.left > 0 && timer.left <= 5
  // Three controls plus the clock don't fit one line on a phone — at 360px the bar is left
  // with about 30px and stops saying anything. So the rest variant stacks: clock and bar
  // read at a glance, controls get their own row. The last five seconds drop the clock for
  // the number itself. −15 and +15 sit together; Skip is at the far edge.
  return (
    <div id="timer" className={finale ? 'rest finale' : 'rest'}>
      <div className="head">
        <div className="t" key={finale ? timer.left : 'clock'}>{finale ? timer.left : clock(timer.left)}</div>
        {finale
          ? <div className="lbl">{t('Rest')}</div>
          : <div className="bar"><i style={{ width: (timer.left / timer.total) * 100 + '%' }} /></div>}
      </div>
      <div className="acts">
        <Button size="sm" icon="minus" onClick={() => addRest(-15)}>15s</Button>
        <Button size="sm" icon="plus" onClick={() => addRest(15)}>15s</Button>
        <Button size="sm" variant="primary" className="skip" onClick={skipRest}>{t('Skip')}</Button>
      </div>
    </div>
  )
}
