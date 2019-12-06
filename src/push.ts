import {
  Capacitor,
  Plugins,
  PushNotification,
  PushNotificationToken,
  PushNotificationActionPerformed
} from '@capacitor/core'
import { fetchText } from './http'
import challengesApi from './lichess/challenges'
import router from './router'
import session from './session'
import settings from './settings'
import { handleXhrError } from './utils'
import { isForeground } from './utils/appMode'

const { PushNotifications, FCM } = Plugins

export default {
  init() {
    PushNotifications.addListener('registration',
      (token: PushNotificationToken) => {

        const tokenPromise = Capacitor.platform === 'ios' ?
          FCM.getToken() : Promise.resolve(token)

        tokenPromise.then(({ value }: PushNotificationToken) => {
          console.debug('Push registration success, FCM token: ' + value)

          fetchText(`/mobile/register/firebase/${value}`, {
            method: 'POST'
          })
          .catch(handleXhrError)
        })
      }
    )

    PushNotifications.addListener('registrationError',
      (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error))
      }
    )

    PushNotifications.addListener('pushNotificationReceived',
      (notification: PushNotification) => {
        if (isForeground()) {
          switch (notification.data['lichess.type']) {
            case 'challengeAccept':
              session.refresh()
              break
            case 'corresAlarm':
            case 'gameTakebackOffer':
            case 'gameDrawOffer':
            case 'gameFinish':
              session.refresh()
              break
            case 'gameMove':
              session.refresh()
              break
          }
        }
      }
    )

    PushNotifications.addListener('pushNotificationActionPerformed',
      (action: PushNotificationActionPerformed) => {
        if (action.actionId === 'tap') {
          switch (action.notification.data['lichess.type']) {
            case 'challengeAccept':
              challengesApi.refresh()
              router.set(`/game/${action.notification.data['lichess.challengeId']}`)
              break
            case 'challengeCreate':
              router.set(`/challenge/${action.notification.data['lichess.challengeId']}`)
              break
            case 'corresAlarm':
            case 'gameMove':
            case 'gameFinish':
            case 'gameTakebackOffer':
            case 'gameDrawOffer':
              router.set(`/game/${action.notification.data['lichess.fullId']}`)
              break
            case 'newMessage':
              router.set(`/inbox/${action.notification.data['lichess.threadId']}`)
              break
          }
        }
      }
    )
  },

  register(): Promise<void> {
    if (settings.general.notifications.allow()) {
      return PushNotifications.register()
    }

    return Promise.resolve()
  },

  unregister(): Promise<string> {
    return fetchText('/mobile/unregister', { method: 'POST' })
  }
}

