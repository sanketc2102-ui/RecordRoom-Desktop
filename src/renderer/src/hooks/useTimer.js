import { useCallback, useEffect, useRef, useState } from 'react'

// Counts whole seconds. start() / stop() can be called repeatedly (pause and resume);
// reset() sets the clock back to 0.
export default function useTimer() {
  const [seconds, setSeconds] = useState(0)
  const secondsRef = useRef(0)
  const timerRef = useRef(null)

  const stop = useCallback(() => clearInterval(timerRef.current), [])

  const start = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      secondsRef.current += 1
      setSeconds(secondsRef.current)
    }, 1000)
  }, [])

  const reset = useCallback(() => {
    secondsRef.current = 0
    setSeconds(0)
  }, [])

  useEffect(() => stop, [stop]) // never leave an interval running after unmount

  return { seconds, start, stop, reset }
}
