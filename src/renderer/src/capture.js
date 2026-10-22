// Guaranteed 1080p recording.
// Chromium's screen capture gives you the screen's native size (and won't upscale a small
// screen), so instead we draw the screen onto a fixed 1920x1080 canvas and record the canvas.
export const OUT_W = 1920
export const OUT_H = 1080
const FPS = 30

export const screenConstraints = (sourceId, withAudio) => ({
  audio: withAudio ? { mandatory: { chromeMediaSource: 'desktop' } } : false,
  video: {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: sourceId,
      maxFrameRate: FPS
    }
  }
})

// Returns { stream, source: {width, height}, stop() }
// `stream` is a 1920x1080 video-only MediaStream to give to MediaRecorder.
export async function createCanvasStream(screenStream) {
  const video = document.createElement('video')
  video.muted = true
  video.srcObject = new MediaStream(screenStream.getVideoTracks())
  await video.play()

  const canvas = document.createElement('canvas')
  canvas.width = OUT_W
  canvas.height = OUT_H
  const ctx = canvas.getContext('2d', { alpha: false })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const draw = () => {
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return
    // fit inside 1920x1080 without stretching (black bars only if the screen isn't 16:9)
    const scale = Math.min(OUT_W / vw, OUT_H / vh)
    const w = vw * scale
    const h = vh * scale
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, OUT_W, OUT_H)
    ctx.drawImage(video, (OUT_W - w) / 2, (OUT_H - h) / 2, w, h)
  }

  draw()
  // setInterval (not requestAnimationFrame) so it keeps running while the window is minimized
  const timer = setInterval(draw, 1000 / FPS)
  const stream = canvas.captureStream(FPS)

  return {
    stream,
    source: { width: video.videoWidth, height: video.videoHeight },
    stop: () => {
      clearInterval(timer)
      stream.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    }
  }
}
