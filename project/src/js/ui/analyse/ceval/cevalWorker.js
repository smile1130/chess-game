import m from 'mithril';

export default function cevalWorker(opts, name) {

  const instance = new Worker(opts.path);
  const switching = m.prop(false); // when switching to new work, info for previous can be emited

  function send(text) {
    instance.postMessage(text);
  }

  function processOutput(text, work) {
    if (/currmovenumber|lowerbound|upperbound/.test(text)) return;
    const matches = text.match(/depth (\d+) .*score (cp|mate) ([-\d]+) .*pv (.+)/);
    if (!matches) return;
    const depth = parseInt(matches[1]);
    if (switching() && depth > 1) return; // stale info for previous work
    switching(false); // got depth 1, it's now computing the current work
    if (depth < opts.minDepth) return;
    var cp, mate;
    if (matches[2] === 'cp') cp = parseFloat(matches[3]);
    else mate = parseFloat(matches[3]);
    if (work.ply % 2 === 1) {
      if (matches[2] === 'cp') cp = -cp;
      else mate = -mate;
    }
    const best = matches[4].split(' ')[0];
    console.log(best);
    work.emit({
      work: work,
      ceval: {
        depth: depth,
        cp: cp,
        mate: mate,
        best: best
      },
      name: name
    });
  }

  // warmup
  send('uci');

  return {
    start(work) {
      switching(true);
      send(['position', 'fen', work.position, 'moves', work.moves].join(' '));
      send('go depth ' + opts.maxDepth);
      instance.onmessage = function(msg) {
        processOutput(msg.data, work);
      };
    },

    stop() {
      send('stop');
      switching(true);
    }
  };
}
