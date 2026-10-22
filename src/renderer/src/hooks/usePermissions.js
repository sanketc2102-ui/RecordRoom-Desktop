import { useState } from 'react'
import { getMicStream, getScreenStream, stopStream } from '../utils/media'

const MIC_BLOCKED =
  'Microphone is blocked. Open Windows Settings > Privacy > Microphone, turn on "Let desktop apps access your microphone", then click again.'
const SCREEN_BLOCKED =
  'Screen capture failed. On Mac, open System Settings > Privacy & Security > Screen Recording, enable RecordRoom, then restart the app.'

// Tracks whether the mic and screen are allowed, and the message to show if one is blocked
export default function usePermissions() {
  const [micOk, setMicOk] = useState(false)
  const [screenOk, setScreenOk] = useState(false)
  const [permError, setPermError] = useState('')

  const request = async (getStream, onGranted, blockedMessage) => {
    try {
      setPermError('')
      stopStream(await getStream()) // just testing access, released right away
      onGranted(true)
    } catch {
      setPermError(blockedMessage)
    }
  }

  const allowMic = () => request(getMicStream, setMicOk, MIC_BLOCKED)
  const allowScreen = () => request(getScreenStream, setScreenOk, SCREEN_BLOCKED)

  return {
    micOk,
    screenOk,
    permError,
    allowMic,
    allowScreen,
    allGranted: micOk && screenOk,
    ready: Number(micOk) + Number(screenOk)
  }
}
