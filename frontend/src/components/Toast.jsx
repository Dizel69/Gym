import { useUI } from '../store/useUI.js'
export default function Toast() {
  const msg = useUI(s => s.toastMsg)
  const action = useUI(s => s.toastAction)
  const run = useUI(s => s.runToastAction)
  return <div id="toast" role="status" className={(msg ? 'show' : '') + (action ? ' has-action' : '')}>
    <span>{msg}</span>
    {action && <button type="button" className="toast-act" onClick={run}>{action.label}</button>}
  </div>
}
