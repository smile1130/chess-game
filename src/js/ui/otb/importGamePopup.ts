import * as throttle from 'lodash/throttle'
import router from '../../router'
import settings from '../../settings'
import i18n from '../../i18n'
import popupWidget from '../shared/popup'
import * as helper from '../helper'
import * as h from 'mithril/hyperscript'

import ImporterCtrl, { IImporterCtrl } from '../importer/ImporterCtrl'

import OtbRound from './OtbRound'

export interface Controller {
  open(): void
  close(fromBB?: string): void
  isOpen(): boolean
  root: OtbRound
  importer: IImporterCtrl
}

export default {

  controller(root: OtbRound) {
    let isOpen = true
    function open() {
      router.backbutton.stack.push(close)
      isOpen = true
    }

    function close(fromBB?: string) {
      if (fromBB !== 'backbutton' && isOpen) router.backbutton.stack.pop()
      isOpen = false
    }

    return {
      open,
      close,
      isOpen: function() {
        return isOpen
      },
      root: root,
      importer: ImporterCtrl()
    }
  },

  view(ctrl: Controller) {
    return popupWidget(
      'OtbImportGamePopup',
      undefined,
      () => {
        const white = settings.otb.whitePlayer
        const black = settings.otb.blackPlayer
        return h('div', [
          h('p', 'Import current game state with following player names to lichess?'),
          h('form', [
            h('div.exchange', {
              oncreate: helper.ontap(() => {
                const w = white()
                const b = black()
                white(b)
                black(w)
              })
            }, h('span.fa.fa-exchange.fa-rotate-90')),
            h('div.importMeta.text_input_container', [
              h('label', i18n('white')),
              h('input[type=text]', {
                value: white(),
                oninput: throttle((e: Event) => {
                  const val = (e.target as HTMLInputElement).value.trim()
                  white(val)
                }, 300),
                onfocus() {
                  this.select()
                },
                spellcheck: false
              })
            ]),
            h('div.importMeta.text_input_container', [
              h('label', i18n('black')),
              h('input[type=text]', {
                value: black(),
                oninput: throttle((e: Event) => {
                  const val = (e.target as HTMLInputElement).value.trim()
                  black(val)
                }, 300),
                onfocus() {
                  this.select()
                },
                spellcheck: false
              })
            ])
          ]),
          h('div.button-wrapper', [
            ctrl.importer.importing() ?
              h('div', [h('span.fa.fa-hourglass-half'), h('span', 'Importing...')]) :
              h('button.withIcon[data-icon=E]', {
                oncreate: helper.ontap(
                  () => {
                    const white = settings.otb.whitePlayer
                    const black = settings.otb.blackPlayer
                    ctrl.root.replay.pgn(white(), black())
                    .then(data => {
                      ctrl.importer.importGame(data.pgn)
                    })
                  }
                )
              }, 'Import to lichess')
          ])
        ])
      },
      ctrl.isOpen(),
      ctrl.close
    )
  }
}
