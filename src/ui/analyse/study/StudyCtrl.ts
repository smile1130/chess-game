import { Study } from '../../../lichess/interfaces/study'
import session from '../../../session'

import SideMenuCtrl from '../../shared/sideMenu/SideMenuCtrl'
import actionMenu, { IActionMenuCtrl } from './actionMenu'
import AnalyseCtrl from '../AnalyseCtrl'

export default class StudyCtrl {
  public readonly data: Study
  public readonly sideMenu: SideMenuCtrl
  public readonly actionMenu: IActionMenuCtrl

  private rootCtrl: AnalyseCtrl

  constructor(data: Study, rootCtrl: AnalyseCtrl) {
    this.data = data
    this.rootCtrl = rootCtrl
    this.actionMenu = actionMenu.controller(this.rootCtrl)
    this.sideMenu = new SideMenuCtrl('right', 'studyMenu', 'studyMenu-backdrop')
  }

  public canContribute(): boolean {
    const myId = session.getUserId()
    const meMember = myId && this.data.members[myId]
    return meMember ? meMember.role === 'w' : false
  }
}
