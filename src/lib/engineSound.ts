/**
 * A tiny synthesized 4-cylinder engine for the landing page "rev" button.
 * Sawtooth + square at the firing frequency, a sub-harmonic for rumble, some filtered
 * noise for intake hiss, all pushed through soft clipping and a lowpass whose cutoff
 * follows the revs. No audio files.
 */
export class EngineSound {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private oscA!: OscillatorNode
  private oscB!: OscillatorNode
  private sub!: OscillatorNode
  private lp!: BiquadFilterNode
  private noiseGain!: GainNode
  private noise!: AudioBufferSourceNode
  private running = false

  start() {
    if (this.running) return
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    this.ctx = this.ctx ?? new Ctx()
    const ctx = this.ctx
    void ctx.resume()

    this.master = ctx.createGain()
    this.master.gain.value = 0
    const shaper = ctx.createWaveShaper()
    shaper.curve = softClip(2.4)
    this.lp = ctx.createBiquadFilter()
    this.lp.type = 'lowpass'
    this.lp.frequency.value = 500
    this.lp.Q.value = 3

    const mix = ctx.createGain()
    mix.gain.value = 0.5

    this.oscA = ctx.createOscillator()
    this.oscA.type = 'sawtooth'
    this.oscB = ctx.createOscillator()
    this.oscB.type = 'square'
    this.sub = ctx.createOscillator()
    this.sub.type = 'triangle'
    const gB = ctx.createGain()
    gB.gain.value = 0.35
    const gSub = ctx.createGain()
    gSub.gain.value = 0.6

    const noise = (this.noise = ctx.createBufferSource())
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    noise.buffer = buf
    noise.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1800
    this.noiseGain = ctx.createGain()
    this.noiseGain.gain.value = 0.02

    this.oscA.connect(mix)
    this.oscB.connect(gB).connect(mix)
    this.sub.connect(gSub).connect(mix)
    noise.connect(bp).connect(this.noiseGain).connect(mix)
    mix.connect(shaper).connect(this.lp).connect(this.master).connect(ctx.destination)

    this.oscA.start()
    this.oscB.start()
    this.sub.start()
    noise.start()
    this.running = true
    this.setRpm(900)
    this.master.gain.setTargetAtTime(0.22, ctx.currentTime, 0.08)
  }

  /** rpm from ~800 (idle) to ~7000 */
  setRpm(rpm: number) {
    if (!this.running || !this.ctx) return
    const t = this.ctx.currentTime
    const fire = (rpm / 60) * 2 // 4 cylinders, 4-stroke: 2 power pulses per revolution
    this.oscA.frequency.setTargetAtTime(fire, t, 0.03)
    this.oscB.frequency.setTargetAtTime(fire * 1.005, t, 0.03)
    this.sub.frequency.setTargetAtTime(fire / 2, t, 0.03)
    const k = Math.min(1, Math.max(0, (rpm - 800) / 6200))
    this.lp.frequency.setTargetAtTime(380 + k * 2600, t, 0.05)
    this.noiseGain.gain.setTargetAtTime(0.015 + k * 0.08, t, 0.05)
  }

  stop() {
    if (!this.running || !this.ctx) return
    const ctx = this.ctx
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
    const nodes: AudioScheduledSourceNode[] = [this.oscA, this.oscB, this.sub, this.noise]
    this.running = false
    window.setTimeout(() => nodes.forEach((n) => n.stop()), 1400)
  }

  get isRunning() {
    return this.running
  }
}

function softClip(amount: number) {
  const n = 1024
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = Math.tanh(x * amount)
  }
  return curve
}
