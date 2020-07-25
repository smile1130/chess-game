import Stream from 'mithril/stream'

export interface IExplorerCtrl {
  allowed: boolean
  setStep(): void
  loading: Stream<boolean>
  failing: Stream<boolean>
  config: any
  withGames: boolean
  current: Stream<ExplorerData>
  fetchMasterOpening: (fen: string) => Promise<ExplorerData>
  fetchTablebaseHit: (fen: string) => Promise<SimpleTablebaseHit>
}

export interface MoveStats {
  uci: Uci
  san: San
}

export interface OpeningMoveStats extends MoveStats {
  white: number
  black: number
  draws: number
  averageRating: number
}
export interface TablebaseMoveStats extends MoveStats {
  wdl: number | null
  dtz: number | null
  dtm: number | null
  checkmate: boolean
  stalemate: boolean
  variant_win: boolean
  variant_loss: boolean
  insufficient_material: boolean
  zeroing: boolean
}

export interface Player {
  rating: number
  name: string
}

export interface Game {
  id: string
  white: Player
  black: Player
  year: string
  winner: Color
}

export interface Opening {
  eco: string
  name: string
}

export interface ExplorerData {
  isOpening?: boolean
  tablebase?: boolean
  moves: readonly MoveStats[]
  fen?: string
}

export interface OpeningData extends ExplorerData {
  moves: readonly OpeningMoveStats[]
  topGames?: readonly Game[]
  recentGames?: readonly Game[]
  opening?: Opening
}

export interface TablebaseData extends ExplorerData {
  moves: readonly TablebaseMoveStats[]
  fen: string
  checkmate: boolean
  stalemate: boolean
  variant_win: boolean
  variant_loss: boolean
}

export interface SimpleTablebaseHit {
  fen: string
  best?: Uci // no move if checkmate/stalemate
  winner: Color | undefined
}

export function isOpeningData(data: ExplorerData): data is OpeningData {
  return !!data.isOpening
}

export function isTablebaseData(data: ExplorerData): data is TablebaseData {
  return !!data.tablebase
}
