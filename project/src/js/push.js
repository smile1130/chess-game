import session from './session';
import settings from './settings';
import { request } from './http';
import { getChallenges } from './xhr';
import challengesApi from './lichess/challenges';
import m from 'mithril';

let push;

export default {
  register() {

    if (settings.general.notifications()) {

      push = window.PushNotification.init({
        android: {
          senderID: window.lichess.gcmSenderId,
          sound: true
        },
        ios: {
          sound: true,
          alert: true,
          badge: true
        }
      });

      push.on('registration', function(data) {
        if (session.isConnected()) {
          // we won't try to register again on failure for now
          const platform = window.cordova.platformId;
          const deviceId = encodeURIComponent(data.registrationId);
          request(`/mobile/register/${platform}/${deviceId}`, {
            method: 'POST',
            deserialize: v => v
          });
        }
      });

      push.on('notification', function(data) {
        // if app was foreground we don't want to disturb too much so we'll
        // just refresh nb of turns in board icon
        const payload = data.additionalData;
        if (payload) {
          if (payload.foreground) {
            // if foreground just refresh according data
            if (payload.userData) {
              switch (payload.userData.type) {
                case 'challengeCreate':
                case 'challengeAccept':
                case 'challengeDecline':
                  getChallenges().then(challengesApi.set);
                  break;
                case 'gameMove':
                case 'gameFinish':
                  session.refresh();
                  break;
              }
            }
          }
          // if background we go to the game or challenge
          else if (payload.userData) {
            switch (payload.userData.type) {
              case 'challengeCreate':
              case 'challengeAccept':
                m.route(`/challenge/${payload.userData.challengeId}`);
                break;
              case 'gameMove':
              case 'gameFinish':
                m.route(`/game/${payload.userData.fullId}`);
                break;
            }
          }
        }
      });

    }
  },

  unregister() {
    if (push) {
      push.unregister(function() {
        request('/mobile/unregister', {
          method: 'POST',
          deserialize: v => v
        }).then(() => push = null);
      }, console.log.bind(console));
    }
  }
};

