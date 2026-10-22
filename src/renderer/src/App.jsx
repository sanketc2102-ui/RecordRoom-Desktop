import { useEffect, useRef, useState } from 'react'
import './assets/preview.css'
import { OUT_W, OUT_H, createCanvasStream, screenConstraints } from './capture'

const AUTO_START = true // true: record as soon as both permissions are allowed. false: show a Start button.

const fmt = (s) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')

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
      const dest = ctx.createMediaStreamDestination()
      ctx.createMediaStreamSource(mic).connect(dest)
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

  const btn = { padding: '10px 18px', fontSize: 15, cursor: 'pointer', margin: 4 }
  const allowedBtn = {
    ...btn,
    background: '#d1fae5',
    border: '1px solid #10b981',
    cursor: 'default'
  }

  return (
    <div className="app">
      {/* ---------- Permissions ---------- */}
      {state === 'permissions' && (
        <div className="bento">
          <section className="card card-yellow span-2 row-2">
            <div>
              <span className="eyebrow">Lecture recorder</span>
              <h1 className="title" style={{ marginTop: 8 }}>
                RecordRoom
              </h1>
            </div>
            <p className="muted">
              Allow microphone and screen recording. As soon as both are allowed, your lecture
              starts recording and is saved on this computer.
            </p>
          </section>

          <section className="card span-2">
            <div className="emoji">🎤</div>
            <div>
              <h2 className="heading">Microphone</h2>
              <p className="muted">Captures your voice during the class.</p>
            </div>
            <button
              className={`btn ${micOk ? 'btn-done' : 'btn-yellow'}`}
              onClick={allowMic}
              disabled={micOk}
            >
              {micOk ? '✓ Microphone allowed' : 'Allow microphone'}
            </button>
          </section>

          <section className="card span-2">
            <div className="emoji">🖥️</div>
            <div>
              <h2 className="heading">Screen recording</h2>
              <p className="muted">Records everything on your screen, in any application.</p>
            </div>
            <button
              className={`btn ${screenOk ? 'btn-done' : 'btn-yellow'}`}
              onClick={allowScreen}
              disabled={screenOk}
            >
              {screenOk ? '✓ Screen recording allowed' : 'Allow screen recording'}
            </button>
          </section>

          {permError && (
            <section className="card card-grey span-4">
              <p className="error-text">{permError}</p>
            </section>
          )}

          {!AUTO_START && micOk && screenOk && (
            <section className="card card-coral span-4">
              <h2 className="heading">Ready to go</h2>
              <button className="btn btn-white" onClick={startRecording}>
                Start recording
              </button>
            </section>
          )}
        </div>
      )}

      {/* ---------- Recording / Paused ---------- */}
      {(state === 'recording' || state === 'paused') && (
        <div className="bento">
          <section className="card span-3 row-2">
            <span className={`chip ${state === 'recording' ? 'chip-coral' : 'chip-purple'}`}>
              <span className={`dot ${state === 'recording' ? 'dot-live' : ''}`} />
              {state === 'recording' ? 'Recording' : 'Paused'}
            </span>
            <div className="timer-sm">{fmt(seconds)}</div>
            <div className="preview">
              <video ref={videoRef} autoPlay muted playsInline />
              {state === 'paused' && <div className="preview-paused">Paused</div>}
            </div>
            <p className="muted">
              {state === 'recording'
                ? `Live preview. Recording at ${OUT_W}×${OUT_H} (your screen is ${srcSize?.width}×${srcSize?.height}).`
                : 'Recording is paused. Click Resume to continue.'}
            </p>
          </section>

          <section className="card card-purple">
            <span className="eyebrow">Source</span>
            <h2 className="heading">Full screen</h2>
            <p className="muted">Mic + system audio</p>
          </section>

          <section className="card card-grey">
            <span className="eyebrow">Saving to</span>
            <p className="path">Videos / RecordRoom</p>
          </section>

          <section className="card span-4">
            <div className="btn-row">
              {state === 'recording' ? (
                <button className="btn btn-purple" onClick={pause}>
                  Pause
                </button>
              ) : (
                <button className="btn btn-yellow" onClick={resume}>
                  Resume
                </button>
              )}
              <button className="btn btn-coral" onClick={stop}>
                Stop and save
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ---------- Saved ---------- */}
      {state === 'saved' && (
        <div className="bento">
          <section className="card card-yellow span-2">
            <div className="emoji">✅</div>
            <div>
              <h1 className="title" style={{ fontSize: 28 }}>
                Recording saved
              </h1>
              <p className="muted">Duration {fmt(seconds)}</p>
            </div>
          </section>

          <section className="card span-2">
            <span className="eyebrow">File location</span>
            <p className="path">{savedPath}</p>
          </section>

          <section className="card span-4">
            <div className="btn-row">
              <button className="btn btn-yellow" onClick={() => window.recorder.reveal(savedPath)}>
                Show in folder
              </button>
              <button className="btn btn-ghost" onClick={startRecording}>
                Record again
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ---------- Error ---------- */}
      {state === 'error' && (
        <div className="bento">
          <section className="card card-coral span-4">
            <h2 className="heading">Something went wrong</h2>
            <p className="muted">{error}</p>
            <div className="btn-row">
              <button className="btn btn-white" onClick={startRecording}>
                Try again
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
