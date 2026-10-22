import Hero from '../components/ui/Hero'
import FileCard from '../components/saved/FileCard'
import { CheckIcon } from '../components/icons'
import { fmt } from '../utils/format'

export default function SavedScreen({ recorder }) {
  const { savedPath, seconds, start } = recorder

  return (
    <main className="view split">
      <Hero tone="purple">
        <span className="badge">
          <CheckIcon size={30} strokeWidth={3} />
        </span>
        <div className="hero-copy">
          <h1 className="display">Session saved</h1>
          <p className="lede">You recorded {fmt(seconds)}. The video is ready on this computer.</p>
        </div>
      </Hero>

      <FileCard savedPath={savedPath} seconds={seconds} onRecordAgain={start} />
    </main>
  )
}
