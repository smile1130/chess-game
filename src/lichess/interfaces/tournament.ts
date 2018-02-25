import { Opening } from './game'

export interface Tournament {
  readonly clock: TournamentClock
  readonly createdBy: string
  featured?: FeaturedGame
  readonly fullName: string
  readonly id: string
  readonly isFinished: boolean
  readonly isRecentlyFinished?: boolean
  readonly isStarted: boolean
  readonly me?: TournamentMe
  readonly minutes: number
  readonly nbPlayers: number
  readonly pairings: ReadonlyArray<TournamentPairing>
  readonly pairingsClosed: boolean
  readonly perf: Perf
  readonly podium?: ReadonlyArray<PodiumPlace>
  readonly position?: Opening
  readonly private: boolean
  readonly quote?: Quote
  readonly schedule: Schedule
  readonly secondsToStart?: number
  readonly secondsToFinish?: number
  readonly socketVersion: number
  readonly spotlight?: Spotlight
  readonly standing: StandingPage
  readonly startsAt: string
  readonly system: string
  readonly variant: VariantKey
  readonly verdicts: Verdicts
}

interface Perf {
  readonly icon: string
  readonly name: string
  readonly position?: number
}

export interface TournamentClock {
  readonly increment: number
  readonly limit: number
}

interface FeaturedGame {
  black: FeaturedColorPlayer
  clock: FeaturedClock
  color: string
  fen: string
  id: string
  lastMove: string
  opponent: FeaturedPlayer
  player: FeaturedPlayer
  white: FeaturedColorPlayer
}

interface TournamentMe {
  rank: number
  readonly username: string
  readonly withdraw: boolean
}

interface FeaturedColorPlayer {
  readonly name: string
  readonly rank: number
  readonly rating: number
  readonly ratingDiff: number
}

interface FeaturedPlayer {
  readonly rating: number
  readonly user: FeaturedPlayerUser
}

interface FeaturedPlayerUser {
  readonly username: string
}

interface FeaturedClock {
  readonly increment: number
  readonly initial: number
}

interface TournamentPairing {
  readonly id: string
  readonly s: number
  readonly u: ReadonlyArray<string>
}

export interface PodiumPlace {
  readonly name: string
  readonly nb: PlayerInfoNb
  readonly performance: number
  readonly rank: number
  readonly rating: number
  readonly ratingDiff: number
  readonly score: number
}

interface Quote {
  readonly author: string
  readonly text: string
}

interface Schedule {
  readonly freq: string
  readonly speed: string
}

export interface Spotlight {
  readonly iconFont: string
  readonly headline: string
  readonly description: string
}

export interface StandingPage {
  readonly page: number
  readonly players: ReadonlyArray<StandingPlayer>
}

export interface StandingPlayer {
  readonly name: string
  readonly provisional: boolean
  readonly rank: number
  readonly rating: number
  readonly ratingDiff: number
  readonly score: number
  readonly sheet: Sheet
  readonly withdraw?: boolean
}

interface Sheet {
  readonly fire: boolean
  readonly scores: ReadonlyArray<ReadonlyArray<number>>
  readonly total: number
}

export interface Verdicts {
  readonly accepted: boolean
  readonly list: ReadonlyArray<Verdict>
}

interface Verdict {
  readonly condition: string
  readonly verdict: string
}

export interface PlayerInfo {
  readonly pairings: ReadonlyArray<PlayerInfoPairing>
  readonly player: PlayerInfoPlayer
}

export interface PlayerInfoPairing {
  readonly berserk: boolean
  readonly color: Color
  readonly id: string
  readonly op: PlayerInfoOpponent
  readonly score: [number, number] | number | null
  readonly status: number
  readonly win: boolean | null
}

interface PlayerInfoOpponent {
  readonly name: string
  readonly rating: number
}

interface PlayerInfoPlayer {
  readonly fire: boolean
  readonly id: string
  readonly name: string
  readonly nb: PlayerInfoNb
  readonly performance: number
  readonly rank: number
  readonly rating: number
  readonly ratingDiff: number
  readonly score: number | ReadonlyArray<number>
}

interface PlayerInfoNb {
  readonly berserk: number
  readonly game: number
  readonly win: number
}

export interface TournamentLists {
  started: TournamentListItem[]
  created: TournamentListItem[]
  finished: TournamentListItem[]
  [i: string]: TournamentListItem[]
}

export interface TournamentListItem {
  readonly clock: TournamentClock
  readonly conditions: Conditions
  readonly createdBy: string
  readonly finishesAt: number
  readonly fullName: string
  readonly id: string
  readonly minutes: number
  readonly nbPlayers: number
  readonly perf: Perf
  readonly private: boolean
  readonly rated: boolean
  readonly schedule?: Schedule
  readonly secondsToStart: number
  readonly startsAt: number
  readonly status: number
  readonly system: string
  readonly variant: Variant
  readonly winner: WinnerUser
}

interface WinnerUser {
  readonly id: string
  readonly name: string
  readonly title: string
}

interface Conditions {
  readonly maxRating: string
  readonly nbRatedGame: string
}

export interface TournamentCreateResponse {
  readonly id: string
}
