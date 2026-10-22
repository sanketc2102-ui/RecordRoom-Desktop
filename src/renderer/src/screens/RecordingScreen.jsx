import LivePreview from '../components/recording/LivePreview'
import ClockCard from '../components/recording/ClockCard'
import RecordingControls from '../components/recording/RecordingControls'

export default function RecordingScreen({ recorder }) {
  const { isLive, isPaused, seconds, srcSize, analyserRef, getPreviewStream } = recorder

  return (
    <main className="view stage">
      <LivePreview
        isLive={isLive}
        isPaused={isPaused}
        srcSize={srcSize}
        getPreviewStream={getPreviewStream}
      />

      <aside className="console">
        <ClockCard
          isLive={isLive}
          isPaused={isPaused}
          seconds={seconds}
          analyserRef={analyserRef}
        />

        <dl className="facts">
          <div className="fact">
            <dt>Source</dt>
            <dd>Full screen, mic and system sound</dd>
          </div>
          <div className="fact">
            <dt>Saves to</dt>
            <dd>Videos / RecordRoom</dd>
          </div>
        </dl>

        <RecordingControls
          isLive={isLive}
          onPause={recorder.pause}
          onResume={recorder.resume}
          onStop={recorder.stop}
        />
      </aside>
    </main>
  )
}
