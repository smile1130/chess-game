import * as h from 'mithril/hyperscript'
import i18n  from '../../../i18n'
import socket from '../../../socket'
import { handleXhrError, shallowEqual } from '../../../utils'
import redraw from '../../../utils/redraw'
import { batchRequestAnimationFrame } from '../../../utils/batchRAF'
import * as gameApi from '../../../lichess/game'
import spinner from '../../../spinner'
import { playerName } from '../../../lichess/player'
import { AnalyseData, RemoteEvalSummary } from '../../../lichess/interfaces/analyse'
import { Study, findTag } from '../../../lichess/interfaces/study'
import * as helper from '../../helper'

import { requestComputerAnalysis } from '../analyseXhr'
import AnalyseCtrl from '../AnalyseCtrl'
import drawAcplChart from '../charts/acpl'
import drawMoveTimesChart from '../charts/moveTimes'

export default function renderAnalysis(ctrl: AnalyseCtrl): Mithril.BaseNode {
  const isPortrait = helper.isPortrait()
  const vd = helper.viewportDim()
  const d = ctrl.data

  return h('div.analyse-gameAnalysis.native_scroller', [
    d.analysis ? renderAnalysisGraph(ctrl, vd, isPortrait) :
      ctrl.study ? renderStudyAnalysisRequest(ctrl) : renderGameAnalysisRequest(ctrl),
    d.game.moveCentis ? renderMoveTimes(ctrl, d.game.moveCentis, vd, isPortrait) : null
  ])
}

function renderAnalysisGraph(ctrl: AnalyseCtrl, vd: helper.ViewportDim, isPortrait: boolean) {
  return h('div.analyse-computerAnalysis', {
    key: 'analysis'
  }, [
    h('strong.title', i18n('computerAnalysis')),
    ctrl.analysisProgress ?
    h('div.analyse-gameAnalysis_chartPlaceholder', spinner.getVdom('monochrome')) :
    h('svg#acpl-chart.analyse-chart', {
      key: 'chart',
      width: isPortrait ? vd.vw : vd.vw - vd.vh + helper.headerHeight,
      height: 100,
      oncreate({ dom }: Mithril.DOMNode) {
        setTimeout(() => {
          this.updateCurPly = drawAcplChart(dom as SVGElement, ctrl.data, ctrl.node.ply)
        }, 100)
      },
      onupdate() {
        if (this.updateCurPly) batchRequestAnimationFrame(() => {
          if (ctrl.onMainline) this.updateCurPly(ctrl.node.ply)
          else this.updateCurPly(null)
        })
      }
    }),
    h(AcplSummary, {
      d: ctrl.data,
      analysis: ctrl.data.analysis!,
      study: ctrl.study && ctrl.study.data
    })
  ])
}

const AcplSummary: Mithril.Component<{
  d: AnalyseData
  analysis: RemoteEvalSummary
  study?: Study
}, {}> = {
  onbeforeupdate({ attrs }, { attrs: oldattrs }) {
    return !shallowEqual(attrs.analysis, oldattrs.analysis)
  },

  view({ attrs }) {
    const { d, analysis, study } = attrs

    return h('div.analyse-evalSummary', ['white', 'black'].map((color: Color) => {
      const p = gameApi.getPlayer(d, color)
      const pName = study ? findTag(study, color) || 'Anonymous' : playerName(p)

      return h('table', [
        h('thead', h('tr', [
          h('th', h('span.color-icon.' + color)),
          h('td', [pName, p ? helper.renderRatingDiff(p) : null])
        ])),
        h('tbody', [
          advices.map(a => {
            const nb = analysis && analysis[color][a[0]]
            return h('tr', [
              h('th', nb),
              h('td', i18n(a[1]))
            ])
          }),
          h('tr', [
            h('th', analysis && analysis[color].acpl),
            h('td', i18n('averageCentipawnLoss'))
          ])
        ])
      ])
    }))
  }
}

function renderGameAnalysisRequest(ctrl: AnalyseCtrl) {
  return h('div.analyse-computerAnalysis.request', {
    key: 'request-analysis'
  }, [
    ctrl.analysisProgress ? h('div.analyse-requestProgress', [
      h('span', 'Analysis in progress'),
      spinner.getVdom('monochrome')
    ]) : h('button.fatButton', {
      oncreate: helper.ontapXY(() => {
        return requestComputerAnalysis(ctrl.data.game.id)
        .then(() => {
          ctrl.analysisProgress = true
          redraw()
        })
        .catch(handleXhrError)
      })
    }, [i18n('requestAComputerAnalysis')])
  ])
}

function renderStudyAnalysisRequest(ctrl: AnalyseCtrl) {
  // TODO enable request button when study socket implemented
  return h('div.analyse-computerAnalysis.request', {
    key: 'request-analysis'
  }, ctrl.mainline.length < 5 ? h('p', 'The study is too short to be analysed.') :
      !ctrl.study!.canContribute() ? h('p', 'Only the study contributors can request a computer analysis') : [
        h('p', [
          'Get a full server-side computer analysis of the main line.',
          h('br'),
          'Make sure the chapter is complete, for you can only request analysis once.'
        ]),
        ctrl.analysisProgress ? h('div.analyse-requestProgress', [
          h('span', 'Analysis in progress'),
          spinner.getVdom('monochrome')
        ]) : h('button.fatButton[disabled]', {
          oncreate: helper.ontapXY(() => {
            socket.send('requestAnalysis', ctrl.study!.data.chapter.id)
            ctrl.analysisProgress = true
            redraw()
          })
        }, [i18n('requestAComputerAnalysis')])
    ]
  )
}

function renderMoveTimes(ctrl: AnalyseCtrl, moveCentis: number[], vd: helper.ViewportDim, isPortrait: boolean) {
  return h('div.analyse-moveTimes', {
    key: 'move-times'
  }, [
    h('strong.title', i18n('moveTimes')),
    h('svg#moveTimes-chart.analyse-chart', {
      key: 'movetimes-chart',
      width: isPortrait ? vd.vw : vd.vw - vd.vh + helper.headerHeight,
      height: 150,
      oncreate({ dom }: Mithril.DOMNode) {
        setTimeout(() => {
          this.updateCurPly = drawMoveTimesChart(dom as SVGElement, ctrl.data, moveCentis, ctrl.node.ply)
        }, 100)
      },
      onupdate() {
        if (this.updateCurPly) batchRequestAnimationFrame(() => {
          if (ctrl.onMainline) this.updateCurPly(ctrl.node.ply)
          else this.updateCurPly(null)
        })
      }
    })
  ])
}

const advices = [
  ['inaccuracy', 'inaccuracies'],
  ['mistake', 'mistakes'],
  ['blunder', 'blunders']
]
