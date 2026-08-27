// Most recent public GitHub activity. Unauthenticated, so it is rate limited
// per visitor; on any failure the line just stays hidden.
(function () {
  var el = document.getElementById('activity');
  if (!el || !window.fetch) return;

  var USER = 'natedemoss';

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
        // Public push payloads do not reliably carry a commit count.
        return 'Pushed to';
      case 'PullRequestEvent':
        if (p.action === 'closed' && p.pull_request && p.pull_request.merged) {
          return 'Merged a pull request in';
        }
        if (p.action === 'opened') return 'Opened a pull request in';
        return null;
      case 'CreateEvent':
        if (p.ref_type === 'repository') return 'Started';
        return null;
      case 'IssuesEvent':
        return p.action === 'opened' ? 'Opened an issue in' : null;
      case 'IssueCommentEvent':
        return p.action === 'created' ? 'Commented in' : null;
      case 'ReleaseEvent':
        return p.action === 'published' ? 'Released' : null;
      default:
        return null;
    }
  }

  fetch('https://api.github.com/users/' + USER + '/events/public?per_page=30', {
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

      for (var i = 0; i < events.length; i++) {
        var verb = describe(events[i]);
        if (!verb) continue;

        var repo = events[i].repo.name;
        var a = document.createElement('a');
        a.href = 'https://github.com/' + repo;
        a.textContent = repo;

        el.appendChild(document.createTextNode(verb + ' '));
        el.appendChild(a);
        el.appendChild(document.createTextNode(', ' + ago(events[i].created_at) + '.'));
        el.hidden = false;
        return;
      }
    })
    .catch(function () { /* leave the line hidden */ });
})();
