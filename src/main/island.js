// Floating "island" widget shown while recording, when the main window loses focus.
import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'

const WIDTH = 290
const HEIGHT = 52
const ACTIONS = ['pause', 'resume', 'stop']

export function setupIsland(main) {
  let status = { state: 'idle', seconds: 0 }

  const island = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false, // clicking it never steals focus from the app the user is working in
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  island.setAlwaysOnTop(true, 'screen-saver') // stays above other apps, even full-screen ones
  island.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  island.setContentProtection(true) // keeps the widget OUT of the recording (Windows + macOS)

  if (process.env['ELECTRON_RENDERER_URL']) {
    island.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/island.html`)
  } else {
    island.loadFile(join(__dirname, '../renderer/island.html'))
  }

  const isRecording = () => status.state === 'recording' || status.state === 'paused'

  const show = () => {
    if (island.isDestroyed() || !isRecording() || island.isVisible()) return
    const { workArea } = screen.getPrimaryDisplay()
    island.setPosition(Math.round(workArea.x + (workArea.width - WIDTH) / 2), workArea.y + 10)
    island.webContents.send('island:status', status)
    island.webContents.send('island:shown')
    island.showInactive()
  }

  const hide = () => {
    if (!island.isDestroyed() && island.isVisible()) island.hide()
  }

  // Show when the user leaves RecordRoom, hide when they come back
  main.on('blur', show)
  main.on('minimize', show)
  main.on('hide', show)
  main.on('focus', hide)
  main.on('restore', hide)
  main.on('show', hide)

  // Status (state + seconds) comes from the recorder in the main window
  const onStatus = (_, s) => {
    status = s
    if (!island.isDestroyed()) island.webContents.send('island:status', s)
    if (!isRecording()) hide()
    if (s.state === 'saved' && !main.isDestroyed()) {
      // "Done" pressed on the island: bring the app back to show the saved screen
      if (main.isMinimized()) main.restore()
      main.show()
      main.focus()
    }
  }

  // Island buttons -> main window's recorder
  const onAction = (_, action) => {
    if (ACTIONS.includes(action) && !main.isDestroyed()) {
      main.webContents.send('island:action', action)
    }
  }

  ipcMain.on('island:status', onStatus)
  ipcMain.on('island:action', onAction)

  main.on('closed', () => {
    ipcMain.removeListener('island:status', onStatus)
    ipcMain.removeListener('island:action', onAction)
    if (!island.isDestroyed()) island.destroy()
  })
}
