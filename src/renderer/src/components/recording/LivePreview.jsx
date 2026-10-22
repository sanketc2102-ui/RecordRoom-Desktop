import { useEffect, useRef } from 'react'
import { OUT_W, OUT_H } from '../../config/constants'
import { PauseIcon } from '../icons'

// Live view of the screen being recorded
export default function LivePreview({ isLive, isPaused, srcSize, getPreviewStream }) {
  const videoRef = useRef(null)

  useEffect(() => {
    videoRef.current.srcObject = getPreviewStream()
  }, [getPreviewStream])

  return (
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
  )
}
