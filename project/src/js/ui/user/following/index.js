import helper from '../../helper';
import oninit from './followingCtrl';
import view from './followingView';

export default {
  oninit,
  oncreate: helper.viewFadeIn,
  onbeforeremove: helper.viewFadeOut,
  view
};

