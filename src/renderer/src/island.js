import '@fontsource-variable/figtree'
import './assets/island.css'
import './assets/island.css'

const PAUSE_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>'
const PLAY_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z"/></svg>'

const fmt = (s) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')

const dot = document.getElementById('dot')
const time = document.getElementById('time')
const toggle = document.getElementById('toggle')
const stop = document.getElementById('stop')

const pill = document.querySelector('.island')

// Fully visible when it appears, fades after a few seconds, wakes up on hover
const FADE_AFTER_MS = 3000
let fadeTimer = null
const wake = () => {
  pill.classList.remove('dim')
  clearTimeout(fadeTimer)
  fadeTimer = setTimeout(() => pill.classList.add('dim'), FADE_AFTER_MS)
}
pill.addEventListener('mouseenter', () => {
  clearTimeout(fadeTimer)
  pill.classList.remove('dim')
})
pill.addEventListener('mouseleave', wake)
window.island.onShown(wake)
wake()

let state = 'recording'

const render = (s) => {
  state = s.state
  time.textContent = fmt(s.seconds)
  const paused = s.state === 'paused'
  dot.classList.toggle('paused', paused)
  toggle.innerHTML = paused ? PLAY_ICON : PAUSE_ICON
  toggle.title = paused ? 'Resume' : 'Pause'
}

render({ state: 'recording', seconds: 0 })
window.island.onStatus(render)

toggle.addEventListener('click', () =>
  window.island.action(state === 'paused' ? 'resume' : 'pause')
)
stop.addEventListener('click', () => window.island.action('stop'))
