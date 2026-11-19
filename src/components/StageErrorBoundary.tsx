import { Component, type ReactNode } from 'react'

type State = { failed: boolean }

/** Keeps the page alive if a 3D model or WebGL fails: shows a friendly note instead of a blank screen. */
export class StageErrorBoundary extends Component<{ children: ReactNode; label?: string }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[Car4Girl2] 3D stage failed', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="stage-error" role="alert">
        <p className="kicker">Engine stalled</p>
        <p>{this.props.label ?? 'The 3D view could not load on this device.'} The lesson text still works.</p>
        <button className="btn btn--ghost btn--small" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    )
  }
}
