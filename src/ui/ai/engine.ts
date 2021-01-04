import { Capacitor } from '@capacitor/core'
import { AiRoundInterface } from '../shared/round'
import { StockfishWrapper, getNbCores, getMaxMemory } from '../../stockfish'

interface LevelToDepth {
  [index: number]: number
}

const maxMoveTime = 8000
const maxSkill = 20
const levelToDepth: LevelToDepth = {
  1: 1,
  2: 1,
  3: 2,
  4: 3,
  5: 5,
  6: 8,
  7: 13,
  8: 21
}

export default class Engine {
  private level = 1
  private stockfish: StockfishWrapper
  private isInit = false

  constructor(readonly ctrl: AiRoundInterface, readonly variant: VariantKey) {
    this.stockfish = new StockfishWrapper(variant)

    this.stockfish.addListener(line => {
      const match = line.match(/^bestmove (\w{4})|^bestmove ([PNBRQ]@\w{2})/)
      if (match) {
        if (match[1]) this.ctrl.onEngineMove(match[1])
        else if (match[2]) this.ctrl.onEngineDrop(match[2])
      }
    })
  }

  public init() {
    return this.stockfish.start()
    .then(() => {
      if (!this.isInit) {
        this.isInit = true
        return this.stockfish.send('uci')
        .then(() => this.stockfish.setOption('Threads', getNbCores()))
        .then(async () => {
          const mem = await getMaxMemory()
          if (Capacitor.platform !== 'web') this.stockfish.setOption('Hash', mem)
        })
      }
    })
    .catch(console.error.bind(console))
  }

  public newGame() {
    return this.stockfish.send('ucinewgame')
  }

  public async search(initialFen: string, moves: string) {
    // console.info('engine search pos: ', `position fen ${initialFen} moves ${moves}`)
    await this.stockfish.send(`position fen ${initialFen} moves ${moves}`)
    await this.stockfish.send(`go movetime ${moveTime(this.level)} depth ${depth(this.level)}`)
  }

  public setLevel(l: number) {
    this.level = l
    return this.stockfish.setOption('Skill Level', String(skill(this.level)))
  }

  public exit() {
    return this.stockfish.exit()
  }
}

function moveTime(level: number) {
  return level * maxMoveTime / 8
}

function skill(level: number) {
  return Math.round((level - 1) * (maxSkill / 7))
}

function depth(level: number) {
  return levelToDepth[level]
}
