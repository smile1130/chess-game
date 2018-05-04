import router from '../../router'
import { Session } from '../../session'
import settings from '../../settings'
import { PuzzleData, PuzzleOutcome } from '../../lichess/interfaces/training'

import * as xhr from './xhr'
import { Database, UserOfflineData } from './database'

/*
 * Synchronize puzzles with server and load a new puzzle from offline database.
 */
export function syncAndLoadNewPuzzle(
  database: Database,
  user: Session
): Promise<PuzzleData> {
  return new Promise((resolve, reject) => {
    syncPuzzles(database, user)
    .then(data => {
      if (data && data.unsolved.length > 0) {
        resolve(data.unsolved[0])
      }
      else {
        reject(`No additional offline puzzles available. Go online to get another ${settings.training.puzzleBufferLen}`)
      }
    })
    .catch(reject)
  })
}

/*
 * Load a new puzzle from offline database.
 */
export function loadNewPuzzle(database: Database, user: Session): Promise<PuzzleData> {
  return new Promise((resolve, reject) => {
    database.fetch(user.id)
    .then(data => {
      if (data && data.unsolved.length > 0) {
        resolve(data.unsolved[0])
      }
      else {
        reject(`No additional offline puzzle available. Go online to get another ${settings.training.puzzleBufferLen}`)
      }
    })
    .catch(reject)
  })
}

/*
 * Get the number of remaining puzzles in unsolved queue
 */
export function nbRemainingPuzzles(database: Database, user: Session): Promise<number> {
  return database.fetch(user.id)
  .then(data => data && data.unsolved.length || 0)
}

/*
 * Save puzzle result in database and synchronize with server.
 */
export function syncPuzzleResult(
  database: Database,
  user: Session,
  outcome: PuzzleOutcome
): Promise<void> {
  return database.fetch(user.id)
  .then(data => {
    // if we reach here there must be data
    if (data) {
      database.save(user.id, {
        ...data,
        solved: data.solved.concat([{
          id: outcome.id,
          win: outcome.win
        }]),
        unsolved: data.unsolved.filter(p => p.puzzle.id !== outcome.id)
      })
      .then(() => {
        syncPuzzles(database, user)
      })
    }
  })
}

export function puzzleLoadFailure(reason: any) {
  if (typeof reason === 'string') {
    window.plugins.toast.show(reason, 'long', 'center')
  } else {
    window.plugins.toast.show('Could not load puzzle', 'short', 'center')
  }
  router.set('/')
}

/*
 * Synchronize puzzles with server.
 * The goal is to keep a queue of 50 (see settings) puzzles in the offline database,
 * so that they can be played offline at any time.
 *
 * Each time a puzzle is solved or a new puzzle is requested, this function is called.
 * It keeps track of solved puzzles and unsolved ones. Solved ones are synchronized
 * so that rating is up to date server side, and unsolved ones are downloaded
 * when needed, ie. when the queue length is less than 50.
 *
 * Returns a Promise with synchronized data or null if no data was already here
 * and synchronization could not be performed (when offline for instance).
 */
function syncPuzzles(database: Database, user: Session): Promise<UserOfflineData | null> {
  return database.fetch(user.id)
  .then(stored => {
    const unsolved = stored ? stored.unsolved : []
    const solved = stored ? stored.solved : []

    const puzzleDeficit = Math.max(
      settings.training.puzzleBufferLen - unsolved.length,
      0
    )

    const solvePromise =
      solved.length > 0 ? xhr.solvePuzzlesBatch(solved) : Promise.resolve()

    return solvePromise
    .then(() => !stored || puzzleDeficit > 0 ?
      xhr.newPuzzlesBatch(puzzleDeficit) : Promise.resolve({
        puzzles: [],
        user: stored.user,
      })
    )
    .then(newData => {
      return database.save(user.id, {
        user: newData.user,
        unsolved: unsolved.concat(newData.puzzles),
        solved: []
      })
      .then(o => o[user.id]!)
    })
    // when offline, sync cannot be done so we return same stored data
    .catch(() => stored)
  })
}
