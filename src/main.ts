/// <reference path="dts/index.d.ts" />
import { Capacitor, Plugins } from '@capacitor/core'

import appInit from './app'
import { init as settingsInit } from './settings'
import { init as i18nInit } from './i18n'
import { init as themeInit } from './theme'
import routes from './routes'
import push from './push'
import deepLinks from './deepLinks'

interface XNavigator extends Navigator {
  hardwareConcurrency: number
}

settingsInit()
.then(() => {
  routes.init()
  deepLinks.init()
  push.init()
})
.then(themeInit)
.then(i18nInit)
.then(() => Promise.all([
  Plugins.Device.getInfo(),
  Capacitor.platform === 'ios' ?
    Plugins.CPUInfo.nbCores().then((r: { value: number }) => r.value).catch(() => 1) :
    Promise.resolve((<XNavigator>navigator).hardwareConcurrency || 1),
  Plugins.Stockfish.getMaxMemory().then((r: { value: number }) => r.value).catch(() => 16),
]))
.then(([i, c, m]) => appInit(i, c, m))
.then(() => Plugins.SplashScreen.hide())
