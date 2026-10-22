import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { setupIsland } from './island'

export function createWindow() {
  const win = new BrowserWindow({
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

  return win
}
