import * as Signal from 'signals'

import { Tree } from '../../shared/tree/interfaces'
import { Work, IEngine } from './interfaces'
import { setOption, setVariant } from '../../../utils/stockfish'

const output = new Signal()
const EVAL_REGEX = new RegExp(''
  + /^info depth (\d+) seldepth \d+ multipv (\d+) /.source
  + /score (cp|mate) ([-\d]+) /.source
  + /(?:(upper|lower)bound )?nodes (\d+) nps \S+ /.source
  + /(?:hashfull \d+ )?tbhits \d+ time (\S+) /.source
  + /pv (.+)/.source)

export default function StockfishEngine(variant: VariantKey): IEngine {

  let stopTimeoutId: number

  let curEval: Tree.ClientEval | null = null
  let expectedPvs = 1

  // after a 'go' command, stockfish will be continue to emit until the 'bestmove'
  // message, reached by depth or after a 'stop' command
  // finished here means stockfish has emited the bestmove and is ready for
  // another command
  let finished = true

  // stopped flag is true when a search has been interrupted before its end
  let stopped = false

  // we may have several start requests queued while we wait for previous
  // eval to complete
  let startQueue: Array<Work> = []

  function processOutput(text: string, work: Work) {
    if (text.indexOf('bestmove') === 0) {
      console.info('[stockfish >>]', text)
      finished = true
      work.emit()
    }
    if (stopped) return
    // console.log(text)

    const matches = text.match(EVAL_REGEX)
    if (!matches) return

    const depth = parseInt(matches[1]),
      multiPv = parseInt(matches[2]),
      isMate = matches[3] === 'mate',
      evalType = matches[5],
      nodes = parseInt(matches[6]),
      elapsedMs: number = parseInt(matches[7]),
      moves = matches[8].split(' ')


    let ev = parseInt(matches[4])

    // Track max pv index to determine when pv prints are done.
    if (expectedPvs < multiPv) expectedPvs = multiPv

    // if (depth < opts.minDepth) return

    let pivot = work.threatMode ? 0 : 1
    if (work.ply % 2 === pivot) ev = -ev

    // For now, ignore most upperbound/lowerbound messages.
    // The exception is for multiPV, sometimes non-primary PVs
    // only have an upperbound.
    // See: https://github.com/ddugovic/Stockfish/issues/228
    if (evalType && multiPv === 1) return

    let pvData = {
      moves,
      cp: isMate ? undefined : ev,
      mate: isMate ? ev : undefined,
      depth
    }

    if (multiPv === 1) {
      curEval = {
        fen: work.currentFen,
        maxDepth: work.maxDepth,
        depth,
        knps: nodes / elapsedMs,
        nodes,
        cp: isMate ? undefined : ev,
        mate: isMate ? ev : undefined,
        pvs: [pvData],
        millis: elapsedMs
      }
    } else if (curEval) {
      curEval.pvs.push(pvData)
      curEval.depth = Math.min(curEval.depth, depth)
    }

    if ((multiPv === 1 || multiPv === expectedPvs) && curEval) {
      work.emit(curEval)
    }
  }

  /*
   * Init engine with default options and variant
   */
  function init() {
    return Stockfish.init()
    .then(() => {
      Stockfish.output(output.dispatch)
      return send('uci')
      .then(() => setOption('Ponder', 'false'))
      .then(() => setVariant(variant))
    })
    .catch(err => console.error('stockfish init error', err))
  }

  /*
   * Sends 'stop' command to stockfish
   *
   * Returns a Promise that will be fulfilled when stockfish is ready again
   * to process another 'go' command.
   */
  function stop(): Promise<void> {
    return new Promise((resolve) => {
      if (finished) {
        stopped = true
        resolve()
      } else {
        function listen(msg: string) {
          if (msg.indexOf('bestmove') === 0) {
            output.remove(listen)
            finished = true
            resolve()
          }
        }
        output.add(listen)
        if (!stopped) {
          stopped = true
          send('stop')
        }
      }
    })
  }

  /*
   * Take the last work in queue and clear the queue just after
   * to ensure we send to stockfish only one position to evaluate at a time
   */
  function doStart() {
    const work = startQueue.pop()
    if (work) {
      startQueue = []
      output.removeAll()
      output.add((msg: string) => processOutput(msg, work))

      stopped = false
      finished = false

      return setOption('Threads', work.cores)
      .then(() => setOption('MultiPV', work.forceOneLine ? 1 : work.multiPv))
      .then(() => send(['position', 'fen', work.initialFen, 'moves'].concat(work.moves).join(' ')))
      .then(() => send('go depth ' + work.maxDepth))
    }
  }

  /*
   * Add a search command to the queue
   * The search will start when stockfish is ready (after reinit if it takes more
   * than 5s to stop current search)
   */
  function start(work: Work) {
    startQueue.push(work)

    const timeout: PromiseLike<void> = new Promise((_, reject) => {
      stopTimeoutId = setTimeout(reject, 5 * 1000)
    })

    Promise.race([
      stop(),
      timeout
    ])
    .then(doStart)
    .catch(() => {
      reset().then(doStart)
    })
  }

  function exit() {
    output.removeAll()
    return Stockfish.exit()
  }

  function reset() {
    return exit().then(init)
  }

  return {
    init,
    start,
    stop,
    exit,
    isSearching() {
      return !finished && !stopped
    }
  }
}

function send(text: string) {
  console.info('[stockfish <<]', text)
  return Stockfish.cmd(text)
}
