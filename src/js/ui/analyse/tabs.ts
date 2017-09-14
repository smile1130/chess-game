export interface Tab {
  id: string
  title: string
  className: string
}

export const defaults: Tab[] = [
  {
    id: 'infos',
    title: 'Game informations',
    className: 'fa fa-info-circle'
  },
  {
    id: 'moves',
    title: 'Move list',
    className: 'fa fa-list-alt'
  }
]

export const explorer: Tab = {
  id: 'explorer',
  title: 'Explorer',
  className: 'fa fa-book'
}

export const charts: Tab = {
  id: 'computer',
  title: 'computerAnalysis',
  className: 'fa fa-line-chart'
}
