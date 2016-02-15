import h from '../../helper';
import { header as headerWidget, empty, menuButton } from '../../shared/common';
import layout from '../../layout';
import i18n from '../../../i18n';
import m from 'mithril';
import tabs from 'polythene/tabs/tabs';

export default function view(ctrl) {
  const headerCtrl = tournamentListHeader.bind(undefined, ctrl);
  const bodyCtrl = tournamentListBody.bind(undefined, ctrl);

  return layout.free(headerCtrl, bodyCtrl, empty, empty);
}

const TABS = [{
    id: 'started',
    label: 'In Progress'
}, {
    id: 'created',
    label: 'Upcoming'
}, {
    id: 'finished',
    label: 'Completed'
}];

const tabNavigation = (currentTabFn) => {
    return m('.nav-header', m.component(tabs, {
        buttons: TABS,
        autofit: true,
        selectedTab: currentTabFn(),
        activeSelected: true,
        getState: (state) => {
            currentTabFn(state.index);
        }
    }));
};

function tournamentListHeader() {
  return (
    <nav>
      {menuButton()}
      <h1>{i18n('tournaments')}</h1>
    </nav>
  );
}

function tournamentListBody(ctrl) {
  let arrayName = TABS[ctrl.currentTab()].id;
  return m('.native_scroller .page',
      m('.module-tabs.tabs-routing', [
          tabNavigation(ctrl.currentTab),
          m('.tab-content.layout.center-center',
              m('div', renderTournamentList(ctrl.tournaments()[arrayName], arrayName))
          )
      ])
  );
}

function renderTournamentList (list, id) {
  return (
    <div key={id} className="tournamentList">
      <table className="tournamentList">
        <tr>
          <th className="tournamentHeader"> Name </th>
          <th className="tournamentHeader"> Start </th>
          <th className="tournamentHeader"> End </th>
          <th> </th>
        </tr>
        {list.map(renderTournamentListItem)}
      </table>
    </div>
  );
}

function renderTournamentListItem(tournament) {
  return (
    <tr key={tournament.id} className="tournamentListItem" config={h.ontouchY(() => m.route('/tournament/' + tournament.id))}>
      <td className="tournamentListName">{tournament.fullName}</td>
      <td className="tournamentListTime">{formatTime(tournament.startsAt)}</td>
      <td className="tournamentListTime">{formatTime(tournament.finishesAt)}</td>
      <td className="tournamentListNav">&#xf054;</td>
    </tr>
  );
}

function formatTime(timeInMillis) {
  let date = new Date(timeInMillis);
  let hours = date.getHours().toString();
  if (hours.length < 2)
    hours = '0' + hours;
  let mins = date.getMinutes().toString();
  if (mins.length < 2)
    mins = '0' + mins;
  return hours + ':' + mins;
}
