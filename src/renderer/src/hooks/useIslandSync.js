import { useEffect, useRef } from 'react'

// Connects the main window to the floating island:
//  - sends the current state + seconds to the island
//  - runs pause / resume / stop when the island's buttons are pressed
export default function useIslandSync({ state, seconds, pause, resume, stop }) {
  // Always call the latest handlers without re-subscribing to the island
  const actionsRef = useRef({})
  useEffect(() => {
    actionsRef.current = { pause, resume, stop }
  })

  useEffect(() => {
    window.recorder.sendStatus({ state, seconds })
  }, [state, seconds])

  useEffect(
    () =>
      window.recorder.onIslandAction((action) => {
        if (action === 'pause') actionsRef.current.pause()
        if (action === 'resume') actionsRef.current.resume()
        if (action === 'stop') actionsRef.current.stop()
      }),
    []
  )
}
