import { registerRecordingIpc } from './recording'
import { registerSystemIpc } from './system'

export function registerIpcHandlers() {
  registerRecordingIpc()
  registerSystemIpc()
}
