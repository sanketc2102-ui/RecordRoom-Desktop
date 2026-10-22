import { desktopCapturer, ipcMain, shell } from 'electron'

export function registerSystemIpc() {
  ipcMain.handle('screen:source', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    return sources[0].id // primary monitor
  })

  ipcMain.handle('file:reveal', (_, p) => shell.showItemInFolder(p))
}
