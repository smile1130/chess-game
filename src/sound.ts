import settings from './settings'
import * as throttle from 'lodash/throttle'

interface Media {
  move: string
  capture: string
  explosion: string
  lowtime: string
  dong: string
  berserk: string
  clock: string
}

let shouldPlay: boolean
let lla: LLA
let media: Readonly<Media>

if (window.cordova.platformId === 'ios') {
  media = {
    move: 'sounds/move.aifc',
    capture: 'sounds/capture.aifc',
    explosion: 'sounds/explosion.aifc',
    lowtime: 'sounds/lowtime.aifc',
    dong: 'sounds/dong.aifc',
    berserk: 'sounds/berserk.aifc',
    clock: 'sounds/clock.aifc'
  }
}
else {
  media = {
    move: 'sounds/move.mp3',
    capture: 'sounds/capture.mp3',
    explosion: 'sounds/explosion.mp3',
    lowtime: 'sounds/lowtime.mp3',
    dong: 'sounds/dong.mp3',
    berserk: 'sounds/berserk.mp3',
    clock: 'sounds/clock.mp3'
  }
}

document.addEventListener('deviceready', () => {

  shouldPlay = settings.general.sound()

  if (window.hotjs) {
    window.hotjs.Audio!.init!()
    lla = window.hotjs.Audio
  } else {
    lla = window.plugins.LowLatencyAudio
  }

  lla.preloadFX('move', media.move)
  lla.preloadFX('capture', media.capture)
  lla.preloadFX('explosion', media.explosion)
  lla.preloadFX('lowtime', media.lowtime)
  lla.preloadFX('dong', media.dong)
  lla.preloadFX('berserk', media.berserk)
  lla.preloadFX('clock', media.clock)
}, false)


export default {
  move() {
    if (shouldPlay) lla.play('move')
  },
  throttledMove: throttle(() => {
    if (shouldPlay) lla.play('move')
  }, 50),
  capture() {
    if (shouldPlay) lla.play('capture')
  },
  throttledCapture: throttle(() => {
    if (shouldPlay) lla.play('capture')
  }, 50),
  explosion() {
    if (shouldPlay) lla.play('explosion')
  },
  throttledExplosion: throttle(() => {
    if (shouldPlay) lla.play('explosion')
  }, 50),
  lowtime() {
    if (shouldPlay) lla.play('lowtime')
  },
  dong() {
    if (shouldPlay) lla.play('dong')
  },
  berserk() {
    if (shouldPlay) lla.play('berserk')
  },
  clock() {
    if (shouldPlay) lla.play('clock')
  },
  onSettingChange(v: boolean) {
    shouldPlay = v
  }
}
