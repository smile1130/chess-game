import { fetchJSON, fetchText } from '../../../http'
import { AnalyseData } from '../../../lichess/interfaces/analyse'
import { Study } from '../../../lichess/interfaces/study'

interface StudyXhrData {
  analysis: AnalyseData
  study: Study
}

export function load(id: string, chapterId?: string): Promise<StudyXhrData> {
  return fetchJSON<StudyXhrData>(`/study/${id}` + (chapterId ? `/${chapterId}` : ''))
}

export function studyPGN(id: string) {
  return fetchText(`/study/${id}.pgn`, undefined, true)
}

export function studyChapterPGN(id: string, chapterId: string) {
  return fetchText(`/study/${id}/${chapterId}.pgn`, undefined, true)
}
