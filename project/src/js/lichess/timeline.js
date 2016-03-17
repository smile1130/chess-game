import storage from '../storage';

const STORAGEKEY = 'timeline.timestamp';

var timeline = [];

export default {
  get() {
    return timeline;
  },

  set(t) {
    timeline = t.entries.filter(o => o.type === 'game-end');
  },

  setLastReadTimestamp() {
    if (timeline[0]) storage.set(STORAGEKEY, timeline[0].date);
  },

  hasUnread() {
    return timeline[0] && storage.get(STORAGEKEY) < timeline[0].date;
  }
};
