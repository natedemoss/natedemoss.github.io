// Recent public GitHub activity as rows of a booktabs table.
// Unauthenticated, so it is rate limited per visitor; on failure the table
// says so and links to the profile instead.
(function () {
  var body = document.getElementById('activity-rows');
  if (!body || !window.fetch) return;

  var USER = 'natedemoss';
  var MAX_ROWS = 5;

  function ago(iso) {
    var secs = (Date.now() - new Date(iso).getTime()) / 1000;
    var units = [
      [31536000, 'year'], [2592000, 'month'], [86400, 'day'],
      [3600, 'hour'], [60, 'minute']
    ];
    for (var i = 0; i < units.length; i++) {
      var n = Math.floor(secs / units[i][0]);
      if (n >= 1) return n + ' ' + units[i][1] + (n === 1 ? '' : 's') + ' ago';
    }
    return 'just now';
  }

  function describe(ev) {
    var p = ev.payload || {};
    switch (ev.type) {
      case 'PushEvent':
        return 'Pushed';
      case 'PullRequestEvent':
        if (p.action === 'closed' && p.pull_request && p.pull_request.merged) return 'Merged PR';
        if (p.action === 'opened') return 'Opened PR';
        return null;
      case 'PullRequestReviewEvent':
        return 'Reviewed PR';
      case 'CreateEvent':
        return p.ref_type === 'repository' ? 'Created repo' : null;
      case 'IssuesEvent':
        return p.action === 'opened' ? 'Opened issue' : null;
      case 'IssueCommentEvent':
        return p.action === 'created' ? 'Commented' : null;
      case 'ReleaseEvent':
        return p.action === 'published' ? 'Released' : null;
      case 'WatchEvent':
        return 'Starred';
      case 'ForkEvent':
        return 'Forked';
      default:
        return null;
    }
  }

  function cell(tag, cls, child) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (typeof child === 'string') el.textContent = child;
    else if (child) el.appendChild(child);
    return el;
  }

  function fail() {
    body.textContent = '';
    var a = document.createElement('a');
    a.href = 'https://github.com/' + USER;
    a.textContent = 'github.com/' + USER;
    var td = cell('td', 'placeholder');
    td.colSpan = 3;
    td.appendChild(document.createTextNode('Could not reach the GitHub API; see '));
    td.appendChild(a);
    td.appendChild(document.createTextNode('.'));
    var tr = document.createElement('tr');
    tr.appendChild(td);
    body.appendChild(tr);
  }

  fetch('https://api.github.com/users/' + USER + '/events/public?per_page=50', {
    headers: { Accept: 'application/vnd.github+json' }
  })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (events) {
      // The feed is not strictly ordered by time, so sort before picking.
      events.sort(function (x, y) {
        return new Date(y.created_at) - new Date(x.created_at);
      });

      var rows = [];
      for (var i = 0; i < events.length && rows.length < MAX_ROWS; i++) {
        var verb = describe(events[i]);
        if (!verb) continue;
        var repo = events[i].repo.name;
        var prev = rows[rows.length - 1];
        // Collapse runs of the same thing (five pushes to one repo is one row).
        if (prev && prev.verb === verb && prev.repo === repo) continue;
        rows.push({ verb: verb, repo: repo, at: events[i].created_at });
      }
      if (!rows.length) throw new Error('empty');

      body.textContent = '';
      rows.forEach(function (r) {
        var a = document.createElement('a');
        a.href = 'https://github.com/' + r.repo;
        a.textContent = r.repo;
        var tr = document.createElement('tr');
        tr.appendChild(cell('td', '', r.verb));
        tr.appendChild(cell('td', 'tt', a));
        var when = cell('td', 'r when', ago(r.at));
        when.title = new Date(r.at).toLocaleString();
        tr.appendChild(when);
        body.appendChild(tr);
      });
    })
    .catch(fail);
})();
