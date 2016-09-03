
export interface RoundInterface {
  chessground: Chessground.Controller

  firstPly(): number
  lastPly(): number

  jump(ply: number): boolean
  jumpNext(): boolean
  jumpPrev(): boolean
  jumpLast(): boolean
}

export interface OnlineRoundInterface extends RoundInterface {
  data: GameData
}

export interface OfflineRoundInterface extends RoundInterface {
  data: OfflineGameData
  replay: any
}

export interface AiRoundInterface extends OfflineRoundInterface {
  onEngineBestMove(bm: string): void
}
