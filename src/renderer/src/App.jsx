import { useEffect, useRef, useState } from 'react'
import { OUT_W, OUT_H, createCanvasStream, screenConstraints } from './capture'

const AUTO_START = true // true: record as soon as both permissions are allowed. false: show a Start button.

const fmt = (s) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')

const fileName = (p) => (p || '').split(/[\\/]/).pop()

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */
const Icon = ({ children, size = 24, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
)
const MicIcon = (p) => (
  <Icon {...p}>
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Icon>
)
const ScreenIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="12" rx="2.5" />
    <path d="M8 20h8M12 16v4" />
  </Icon>
)
const CheckIcon = (p) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
)
const PauseIcon = (p) => (
  <Icon {...p} fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16" rx="1.5" />
    <rect x="14" y="4" width="4" height="16" rx="1.5" />
  </Icon>
)
const PlayIcon = (p) => (
  <Icon {...p} fill="currentColor" stroke="none">
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
  </Icon>
)
const StopIcon = (p) => (
  <Icon {...p} fill="currentColor" stroke="none">
    <rect x="5" y="5" width="14" height="14" rx="3.5" />
  </Icon>
)
const RecordIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
  </Icon>
)
const FolderIcon = (p) => (
  <Icon {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </Icon>
)

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

// Fixed-width digits so the clock never jitters as numbers change
function Clock({ seconds, paused }) {
  return (
    <div
      className={`clock ${paused ? 'is-paused' : ''}`}
      role="timer"
      aria-label={`Elapsed time ${fmt(seconds)}`}
    >
      {fmt(seconds)
        .split('')
        .map((c, i) =>
          c === ':' ? (
            <span key={i} className="colon">
              :
            </span>
          ) : (
            <span key={i} className="digit">
              {c}
            </span>
          )
        )}
    </div>
  )
}

// Live microphone level so trainers can see at a glance that their voice is being captured
const METER_BARS = 24
function MicMeter({ analyserRef, active }) {
  const barsRef = useRef([])

  useEffect(() => {
    const bars = barsRef.current
    const clear = () => bars.forEach((b) => b && b.classList.remove('on'))
    const analyser = analyserRef.current
    if (!active || !analyser) {
      clear()
      return
    }
    const buf = new Uint8Array(analyser.fftSize)
    let smooth = 0
    let raf
    const loop = () => {
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      const level = Math.min(1, Math.sqrt(sum / buf.length) * 4)
      smooth = Math.max(level, smooth * 0.88)
      const lit = Math.round(smooth * METER_BARS)
      bars.forEach((b, i) => b && b.classList.toggle('on', i < lit))
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      cancelAnimationFrame(raf)
      clear()
    }
  }, [active, analyserRef])

  return (
    <div className="meter" aria-hidden="true">
      {Array.from({ length: METER_BARS }, (_, i) => (
        <span
          key={i}
          ref={(el) => (barsRef.current[i] = el)}
          className={i > METER_BARS * 0.8 ? 'hot' : i > METER_BARS * 0.6 ? 'warm' : ''}
          style={{ '--i': i }}
        />
      ))}
    </div>
  )
}

function Hero({ tone, children }) {
  return (
    <section className="hero" data-tone={tone}>
      <span className="hero-art" aria-hidden="true" />
      {children}
    </section>
  )
}

function PermissionTile({ icon, tone, title, text, ok, label, doneLabel, onClick }) {
  return (
    <section className={`perm ${ok ? 'is-ok' : ''}`} data-tone={tone}>
      <div className="perm-icon">{ok ? <CheckIcon /> : icon}</div>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <button className={`btn ${ok ? 'btn-ok' : 'btn-ink'}`} onClick={onClick} disabled={ok}>
        {ok ? doneLabel : label}
      </button>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */
export default function App() {
  const [state, setState] = useState('permissions') // permissions | recording | paused | saved | error
  const [micOk, setMicOk] = useState(false)
  const [screenOk, setScreenOk] = useState(false)
  const [permError, setPermError] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [savedPath, setSavedPath] = useState('')

  const mrRef = useRef(null)
  const streamsRef = useRef([])
  const secondsRef = useRef(0)
  const timerRef = useRef(null)
  const startedRef = useRef(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const [srcSize, setSrcSize] = useState(null)
  const actionsRef = useRef({})

  const tick = () => {
    timerRef.current = setInterval(() => {
      secondsRef.current += 1
      setSeconds(secondsRef.current)
    }, 1000)
  }

  // ---- Permission helpers ----
  const getMicStream = () => navigator.mediaDevices.getUserMedia({ audio: true })

  const getScreenStream = async () => {
    const sourceId = await window.recorder.getSource()
    const constraints = (withAudio) => screenConstraints(sourceId, withAudio)
    try {
      return await navigator.mediaDevices.getUserMedia(constraints(true)) // screen + system audio
    } catch {
      return await navigator.mediaDevices.getUserMedia(constraints(false)) // screen only
    }
  }

  const stopStream = (s) => s.getTracks().forEach((t) => t.stop())

  const allowMic = async () => {
    try {
      setPermError('')
      stopStream(await getMicStream()) // just testing access, released right away
      setMicOk(true)
    } catch {
      setPermError(
        'Microphone is blocked. Open Windows Settings > Privacy > Microphone, turn on "Let desktop apps access your microphone", then click again.'
      )
    }
  }

  const allowScreen = async () => {
    try {
      setPermError('')
      stopStream(await getScreenStream()) // just testing access, released right away
      setScreenOk(true)
    } catch {
      setPermError(
        'Screen capture failed. On Mac, open System Settings > Privacy & Security > Screen Recording, enable RecordRoom, then restart the app.'
      )
    }
  }

  // ---- Recording ----
  const startRecording = async () => {
    try {
      setError('')
      const screen = await getScreenStream()
      const mic = await getMicStream()
      streamsRef.current = [screen, mic]

      // Mix system audio + mic into one track
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const dest = ctx.createMediaStreamDestination()
      const micSource = ctx.createMediaStreamSource(mic)
      micSource.connect(dest)
      // Listen to the mic (not connected to speakers) to drive the level meter
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      micSource.connect(analyser)
      analyserRef.current = analyser

      if (screen.getAudioTracks().length > 0) {
        ctx.createMediaStreamSource(new MediaStream(screen.getAudioTracks())).connect(dest)
      }
      // Draw the screen onto a 1920x1080 canvas and record that (always 1080p)
      const canvas = await createCanvasStream(screen)
      canvasRef.current = canvas
      setSrcSize(canvas.source)
      console.log(
        `Screen is ${canvas.source.width}x${canvas.source.height}, recording ${OUT_W}x${OUT_H}`
      )
      const combined = new MediaStream([
        ...canvas.stream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ])

      await window.recorder.start()

      const mr = new MediaRecorder(combined, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 5_000_000 // 1080p needs more than 1.5 Mbps
      })
      mr.ondataavailable = async (e) => {
        if (e.data.size > 0) window.recorder.chunk(await e.data.arrayBuffer())
      }
      mr.start(5000)
      mrRef.current = mr

      secondsRef.current = 0
      setSeconds(0)
      tick()
      setState('recording')
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

  // Auto-start once both permissions are allowed
  useEffect(() => {
    if (AUTO_START && micOk && screenOk && state === 'permissions' && !startedRef.current) {
      startedRef.current = true
      startRecording()
    }
  }, [micOk, screenOk, state])

  const pause = () => {
    mrRef.current.pause()
    clearInterval(timerRef.current)
    setState('paused')
  }

  const resume = () => {
    mrRef.current.resume()
    tick()
    setState('recording')
  }

  const stop = async () => {
    clearInterval(timerRef.current)
    await new Promise((resolve) => {
      mrRef.current.onstop = resolve
      mrRef.current.stop()
    })
    streamsRef.current.forEach(stopStream)
    canvasRef.current?.stop()
    analyserRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    const path = await window.recorder.stop()
    setSavedPath(path)
    setState('saved')
  }

  // Keep the latest handlers for the island buttons
  useEffect(() => {
    actionsRef.current = { pause, resume, stop }
  })

  // Live preview: attach the screen stream to the <video>
  useEffect(() => {
    if ((state === 'recording' || state === 'paused') && videoRef.current) {
      videoRef.current.srcObject = streamsRef.current[0] || null
    }
  }, [state])

  // Tell the island the current state + time
  useEffect(() => {
    window.recorder.sendStatus({ state, seconds })
  }, [state, seconds])

  // Island buttons: pause / resume / stop
  useEffect(
    () =>
      window.recorder.onIslandAction((action) => {
        const mr = mrRef.current
        if (!mr) return
        if (action === 'pause' && mr.state === 'recording') actionsRef.current.pause()
        if (action === 'resume' && mr.state === 'paused') actionsRef.current.resume()
        if (action === 'stop' && mr.state !== 'inactive') actionsRef.current.stop()
      }),
    []
  )

  const ready = Number(micOk) + Number(screenOk)
  const isLive = state === 'recording'
  const isPaused = state === 'paused'

  const chipLabel = {
    permissions: `Setup ${ready} of 2`,
    recording: 'Recording',
    paused: 'Paused',
    saved: 'Saved',
    error: 'Needs attention'
  }[state]

  return (
    <div className="app" data-state={state}>
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          RecordRoom
        </div>
        <span className="chip">
          <span className={`chip-dot ${isLive ? 'is-live' : ''}`} />
          {chipLabel}
        </span>
      </header>

      {/* ---------- Permissions ---------- */}
      {state === 'permissions' && (
        <main className="view split">
          <Hero tone="yellow">
            <h1 className="display">Set up your recording</h1>
            <p className="lede">
              Allow your microphone and screen. Recording starts as soon as both are on, and the
              video is saved on this computer.
            </p>
          </Hero>

          <section className="checklist">
            <div
              className="progress"
              role="progressbar"
              aria-label="Permissions allowed"
              aria-valuemin={0}
              aria-valuemax={2}
              aria-valuenow={ready}
            >
              <span className={ready >= 1 ? 'on' : ''} />
              <span className={ready >= 2 ? 'on' : ''} />
            </div>

            <PermissionTile
              tone="purple"
              icon={<MicIcon />}
              title="Microphone"
              text="Captures your voice during the session."
              ok={micOk}
              label="Allow microphone"
              doneLabel="Allowed"
              onClick={allowMic}
            />
            <PermissionTile
              tone="coral"
              icon={<ScreenIcon />}
              title="Screen recording"
              text="Records your full screen, in any application."
              ok={screenOk}
              label="Allow screen"
              doneLabel="Allowed"
              onClick={allowScreen}
            />

            {permError && (
              <p className="alert" role="alert">
                {permError}
              </p>
            )}

            {!AUTO_START && micOk && screenOk && (
              <button className="btn btn-coral btn-lg" onClick={startRecording}>
                <RecordIcon size={20} /> Start recording
              </button>
            )}
          </section>
        </main>
      )}

      {/* ---------- Recording / Paused ---------- */}
      {(isLive || isPaused) && (
        <main className="view stage">
          <section className="monitor">
            <div className={`frame ${isLive ? 'is-live' : ''}`}>
              <video ref={videoRef} autoPlay muted playsInline />
              <span className="frame-tag">Live preview</span>
              {isPaused && (
                <div className="veil">
                  <PauseIcon size={28} />
                  Recording paused
                </div>
              )}
            </div>
            <p className="note">
              {isLive
                ? `Recording at ${OUT_W}×${OUT_H}. Your screen is ${srcSize?.width}×${srcSize?.height}.`
                : 'Nothing is being recorded. Click Resume to continue.'}
            </p>
          </section>

          <aside className="console">
            <div className="clock-card">
              <div className="live">
                <span className={`live-dot ${isPaused ? 'is-paused' : ''}`} />
                {isLive ? 'Recording' : 'Paused'}
              </div>
              <Clock seconds={seconds} paused={isPaused} />
              <div className="meter-wrap">
                <MicMeter analyserRef={analyserRef} active={isLive} />
                <span className="meter-label">Microphone level</span>
              </div>
            </div>

            <dl className="facts">
              <div className="fact">
                <dt>Source</dt>
                <dd>Full screen, mic and system sound</dd>
              </div>
              <div className="fact">
                <dt>Saves to</dt>
                <dd>Videos / RecordRoom</dd>
              </div>
            </dl>

            <div className="controls">
              {isLive ? (
                <button className="btn btn-purple btn-lg" onClick={pause}>
                  <PauseIcon size={18} /> Pause
                </button>
              ) : (
                <button className="btn btn-yellow btn-lg" onClick={resume}>
                  <PlayIcon size={18} /> Resume
                </button>
              )}
              <button className="btn btn-coral btn-lg" onClick={stop}>
                <StopIcon size={18} /> Stop and save
              </button>
            </div>
          </aside>
        </main>
      )}

      {/* ---------- Saved ---------- */}
      {state === 'saved' && (
        <main className="view split">
          <Hero tone="purple">
            <span className="badge">
              <CheckIcon size={30} strokeWidth={3} />
            </span>
            <div className="hero-copy">
              <h1 className="display">Session saved</h1>
              <p className="lede">
                You recorded {fmt(seconds)}. The video is ready on this computer.
              </p>
            </div>
          </Hero>

          <section className="file-card">
            <div>
              <span className="label">Your video</span>
              <h2 className="file-name">{fileName(savedPath)}</h2>
            </div>
            <p className="file-path">{savedPath}</p>
            <div className="stats">
              <div className="stat">
                <b>{fmt(seconds)}</b>
                <span>Length</span>
              </div>
              <div className="stat">
                <b>
                  {OUT_W}×{OUT_H}
                </b>
                <span>Quality</span>
              </div>
              <div className="stat">
                <b>WebM</b>
                <span>Format</span>
              </div>
            </div>
            <div className="btn-row">
              <button
                className="btn btn-ink btn-lg"
                onClick={() => window.recorder.reveal(savedPath)}
              >
                <FolderIcon size={18} /> Show in folder
              </button>
              <button className="btn btn-soft btn-lg" onClick={startRecording}>
                <RecordIcon size={18} /> Record again
              </button>
            </div>
          </section>
        </main>
      )}

      {/* ---------- Error ---------- */}
      {state === 'error' && (
        <main className="view">
          <Hero tone="coral">
            <div className="hero-copy">
              <h1 className="display">Recording didn’t start</h1>
              <p className="lede">{error || 'Something unexpected happened.'}</p>
              <div className="btn-row">
                <button className="btn btn-ink btn-lg" onClick={startRecording}>
                  Try again
                </button>
              </div>
            </div>
          </Hero>
        </main>
      )}
    </div>
  )
}
