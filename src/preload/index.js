import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('recorder', {
  getSource: () => ipcRenderer.invoke('screen:source'),
  start: () => ipcRenderer.invoke('rec:start'),
  chunk: (buf) => ipcRenderer.send('rec:chunk', buf),
  stop: () => ipcRenderer.invoke('rec:stop'),
  reveal: (p) => ipcRenderer.invoke('file:reveal', p),
  // main window -> island: current state + seconds
  sendStatus: (s) => ipcRenderer.send('island:status', s),
  // island buttons -> main window: 'pause' | 'resume' | 'stop'
  onIslandAction: (cb) => {
    const handler = (_, action) => cb(action)
    ipcRenderer.on('island:action', handler)
    return () => ipcRenderer.removeListener('island:action', handler)
  }
})

// Used only by the floating island window
contextBridge.exposeInMainWorld('island', {
  action: (a) => ipcRenderer.send('island:action', a),
  onStatus: (cb) => ipcRenderer.on('island:status', (_, s) => cb(s)),
  onShown: (cb) => ipcRenderer.on('island:shown', () => cb())
})
