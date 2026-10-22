import { screenConstraints } from './capture'

export const getMicStream = () => navigator.mediaDevices.getUserMedia({ audio: true })

export const getScreenStream = async () => {
  const sourceId = await window.recorder.getSource()
  const constraints = (withAudio) => screenConstraints(sourceId, withAudio)
  try {
    return await navigator.mediaDevices.getUserMedia(constraints(true)) // screen + system audio
  } catch {
    return await navigator.mediaDevices.getUserMedia(constraints(false)) // screen only
  }
}

export const stopStream = (s) => s.getTracks().forEach((t) => t.stop())
