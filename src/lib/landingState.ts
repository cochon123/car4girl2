import { EngineSound } from './engineSound'

/**
 * Mutable state shared between the landing page DOM (scroll, buttons) and the 3D scene.
 * The scene reads it every frame, so nothing here triggers React renders.
 */
export const landing = {
  /** 0..1 while scrolling through the first viewport */
  hero: 0,
  /** 0..1 progress through the sticky "take it apart" section */
  explode: 0,
  /** damped copy of explode, written by the scene */
  explodeS: 0,
  /** pointer, -1..1 */
  px: 0,
  py: 0,
  paint: 'chameleon',
  rev: false,
  rpm: 850,
  /** performance.now() of the last exhaust pop */
  pop: -1e9,
  sound: new EngineSound(),
  ready: false,
}

export const IDLE_RPM = 850
export const REDLINE_RPM = 7000
