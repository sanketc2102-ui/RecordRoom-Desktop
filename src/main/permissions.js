import { session } from 'electron'

// Allow our own window to use mic and screen capture without a popup
export function setupPermissions() {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) =>
    cb(permission === 'media')
  )
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media')
}
