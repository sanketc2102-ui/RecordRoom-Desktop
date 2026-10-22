import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  desktopCapturer,
  session,
  shell,
  systemPreferences
} from 'electron'
import { join } from 'path'
import fs from 'fs'
import { setupIsland } from './island'

let win = null
let stream = null
let filePath = null

function createWindow() {
  win = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 880,
    minHeight: 620,
    title: 'RecordRoom',
    backgroundColor: '#F6F6F6',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false // keeps the timer + recorder accurate while the window is minimized
    }
  })

  setupIsland(win)

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ---- IPC: screen source and file writing ----
ipcMain.handle('screen:source', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] })
  return sources[0].id // primary monitor
})

ipcMain.handle('rec:start', () => {
  const dir = join(app.getPath('videos'), 'RecordRoom')
  fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  filePath = join(dir, `lecture-${stamp}.webm`)
  stream = fs.createWriteStream(filePath)
  return filePath
})

ipcMain.on('rec:chunk', (_, buf) => {
  if (stream) stream.write(Buffer.from(buf))
})

ipcMain.handle('rec:stop', () => {
  return new Promise((resolve) => {
    if (!stream) return resolve(null)
    const saved = filePath
    stream.end(() => {
      stream = null
      resolve(saved)
    })
  })
})

ipcMain.handle('file:reveal', (_, p) => shell.showItemInFolder(p))

// ---- App start ----
app.whenReady().then(() => {
  // Allow our own window to use mic and screen capture without a popup
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) =>
    cb(permission === 'media')
  )
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media')

  createWindow()
})

app.on('before-quit', () => stream?.end()) // keeps the file valid if the app is closed mid-recording
app.on('window-all-closed', () => app.quit())
