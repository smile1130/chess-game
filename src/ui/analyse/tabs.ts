import i18n from '../../i18n'

export interface Tab {
  id: string
  title: string
  className: string
}

export const gameInfos: Tab = {
  id: 'infos',
  title: i18n('gameInformation'),
  className: 'fa fa-info-circle',
}

export const moves: Tab = {
  id: 'moves',
  title: i18n('movesPlayed'),
  className: 'fa fa-list-alt'
}

export const ceval: Tab = {
  id: 'ceval',
  title: 'Stockfish',
  className: 'fa fa-cogs'
}

export const explorer: Tab = {
  id: 'explorer',
  title: i18n('openingExplorer'),
  className: 'fa fa-book'
}

export const charts: Tab = {
  id: 'analysis',
  title: i18n('gameAnalysis'),
  className: 'fa fa-area-chart'
}

export const pgnTags: Tab = {
  id: 'pgnTags',
  title: i18n('pgnTags'),
  className: 'fa fa-tags'
}

export const comments: Tab = {
  id: 'comments',
  title: i18n('comments'),
  className: 'fa fa-comment-o'
}
