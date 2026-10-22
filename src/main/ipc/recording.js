import { app, ipcMain } from 'electron'
import { join } from 'path'
import fs from 'fs'

let stream = null
let filePath = null

// Creates the video file and returns its path
function startRecording() {
  const dir = join(app.getPath('videos'), 'RecordRoom')
  fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  filePath = join(dir, `lecture-${stamp}.webm`)
  stream = fs.createWriteStream(filePath)
  return filePath
}

// Closes the file and returns its path (null if nothing was being recorded)
function stopRecording() {
  return new Promise((resolve) => {
    if (!stream) return resolve(null)
    const saved = filePath
    stream.end(() => {
      stream = null
      resolve(saved)
    })
  })
}

// Keeps the file valid if the app is closed mid-recording
export function closeRecordingStream() {
  stream?.end()
}

export function registerRecordingIpc() {
  ipcMain.handle('rec:start', startRecording)
  ipcMain.on('rec:chunk', (_, buf) => {
    if (stream) stream.write(Buffer.from(buf))
  })
  ipcMain.handle('rec:stop', stopRecording)
}
