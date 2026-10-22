import { useCallback, useRef, useState } from 'react'
import {
  OUT_W,
  OUT_H,
  RECORDER_MIME_TYPE,
  VIDEO_BITS_PER_SECOND,
  CHUNK_INTERVAL_MS
} from '../config/constants'
import { createCanvasStream } from '../utils/capture'
import { createAudioMixer } from '../utils/audio'
import { getMicStream, getScreenStream, stopStream } from '../utils/media'
import useTimer from './useTimer'

// The recording engine. Owns the streams, the MediaRecorder and the session state.
// state: permissions | recording | paused | saved | error
export default function useRecorder() {
  const [state, setState] = useState('permissions')
  const [error, setError] = useState('')
  const [savedPath, setSavedPath] = useState('')
  const [srcSize, setSrcSize] = useState(null)
  const timer = useTimer()

  const mrRef = useRef(null)
  const streamsRef = useRef([])
  const canvasRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)

  const start = async () => {
    try {
      setError('')
      const screen = await getScreenStream()
      const mic = await getMicStream()
      streamsRef.current = [screen, mic]

      const mixer = createAudioMixer(mic, screen)
      audioCtxRef.current = mixer.ctx
      analyserRef.current = mixer.analyser

      // Draw the screen onto a 1920x1080 canvas and record that (always 1080p)
      const canvas = await createCanvasStream(screen)
      canvasRef.current = canvas
      setSrcSize(canvas.source)
      console.log(
        `Screen is ${canvas.source.width}x${canvas.source.height}, recording ${OUT_W}x${OUT_H}`
      )
      const combined = new MediaStream([
        ...canvas.stream.getVideoTracks(),
        ...mixer.stream.getAudioTracks()
      ])

      await window.recorder.start()

      const mr = new MediaRecorder(combined, {
        mimeType: RECORDER_MIME_TYPE,
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND
      })
      mr.ondataavailable = async (e) => {
        if (e.data.size > 0) window.recorder.chunk(await e.data.arrayBuffer())
      }
      mr.start(CHUNK_INTERVAL_MS)
      mrRef.current = mr

      timer.reset()
      timer.start()
      setState('recording')
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

  // pause / resume / stop ignore calls that don't fit the current state,
  // so the window buttons and the floating island can both call them safely.
  const pause = () => {
    const mr = mrRef.current
    if (mr?.state !== 'recording') return
    mr.pause()
    timer.stop()
    setState('paused')
  }

  const resume = () => {
    const mr = mrRef.current
    if (mr?.state !== 'paused') return
    mr.resume()
    timer.start()
    setState('recording')
  }

  const stop = async () => {
    const mr = mrRef.current
    if (!mr || mr.state === 'inactive') return
    timer.stop()
    await new Promise((resolve) => {
      mr.onstop = resolve
      mr.stop()
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

  // The screen stream shown in the live preview
  const getPreviewStream = useCallback(() => streamsRef.current[0] || null, [])

  return {
    state,
    error,
    savedPath,
    srcSize,
    seconds: timer.seconds,
    analyserRef,
    isLive: state === 'recording',
    isPaused: state === 'paused',
    isActive: state === 'recording' || state === 'paused',
    start,
    pause,
    resume,
    stop,
    getPreviewStream
  }
}
