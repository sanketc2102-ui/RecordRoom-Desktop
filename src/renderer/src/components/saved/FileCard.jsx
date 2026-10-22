import { OUT_W, OUT_H } from '../../config/constants'
import { fmt, fileName } from '../../utils/format'
import { FolderIcon, RecordIcon } from '../icons'

export default function FileCard({ savedPath, seconds, onRecordAgain }) {
  return (
    <section className="file-card">
      <div>
        <span className="label">Your video</span>
        <h2 className="file-name">{fileName(savedPath)}</h2>
      </div>
      <p className="file-path">{savedPath}</p>
      <div className="stats">
        <div className="stat">
          <b>{fmt(seconds)}</b>
          <span>Length</span>
        </div>
        <div className="stat">
          <b>
            {OUT_W}×{OUT_H}
          </b>
          <span>Quality</span>
        </div>
        <div className="stat">
          <b>WebM</b>
          <span>Format</span>
        </div>
      </div>
      <div className="btn-row">
        <button className="btn btn-ink btn-lg" onClick={() => window.recorder.reveal(savedPath)}>
          <FolderIcon size={18} /> Show in folder
        </button>
        <button className="btn btn-soft btn-lg" onClick={onRecordAgain}>
          <RecordIcon size={18} /> Record again
        </button>
      </div>
    </section>
  )
}
