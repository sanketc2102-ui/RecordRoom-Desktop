import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('recorder', {
  getSource: () => ipcRenderer.invoke('screen:source'),
  start: () => ipcRenderer.invoke('rec:start'),
  chunk: (buf) => ipcRenderer.send('rec:chunk', buf),
  stop: () => ipcRenderer.invoke('rec:stop'),
  reveal: (p) => ipcRenderer.invoke('file:reveal', p)
})