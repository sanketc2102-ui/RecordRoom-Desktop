import { app } from 'electron'
import { createWindow } from './window'
import { setupPermissions } from './permissions'
import { registerIpcHandlers } from './ipc'
import { closeRecordingStream } from './ipc/recording'

app.whenReady().then(() => {
  setupPermissions()
  registerIpcHandlers()
  createWindow()
})

app.on('before-quit', closeRecordingStream)
app.on('window-all-closed', () => app.quit())
