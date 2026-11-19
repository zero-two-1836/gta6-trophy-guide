/* Leonida Trophy Guide — tracker logic. Static, offline: the only request the
   app makes is a same-origin fetch of data/trophies.json. Progress and notes
   live in localStorage; export/import move them as a JSON file. */
(function () {
  'use strict';

  var STORE_KEY = 'gta6-trophy-guide-v2';
  var NOTES_KEY = 'gta6-trophy-notes-v2';
  var DEMO_IDS = [2, 3, 4, 5, 8, 15, 16, 19, 21, 32, 35, 42, 53];

  /* Source names used in trophies.json -> the page they come from. Links open
     only when the reader follows them; the app fetches nothing from them. */
  var SOURCES = {
    'Official list': 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/',
    'GTABase': 'https://www.gtabase.com/articles/gta-6/gta-6-achievements-trophies-list-ps5-xbox-series',
    'PowerPyx': 'https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/',
    'KeenGamer': 'https://www.keengamer.com/articles/guides/gta-6-trophy-guide-platinum-roadmap-all-55-trophies/',
    'Output Lag': 'https://outputlag.com/guides/gta-6-trophy-list/',
    'PSNProfiles': 'https://psnprofiles.com/trophies/43531-grand-theft-auto-vi'
  };

  /* Roadmap stages, built from the official descriptions: which trophies
     belong to each stage of the run to the platinum. */
  var STAGES = [
    {
      title: 'Stage 1 — Play the story (about 60–80 h)',
      text: 'Five chapters, no mission replay, no New Game Plus. Take optional missions and character quests as they appear — many are only offered for a while. Scan vehicles with the WAiNK app and study animals with binoculars as you go: 200 vehicle scans and 100 animal studies count toward 100% later.',
      ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
    },
    {
      title: 'Stage 2 — The 100% checklist (about 100 h)',
      text: 'After the credits, open Progress > Stats > 100% Completion and work the table below. It is closer to 60% true completion: every robbery, bank vault and gang operation, underwater finds, every Shooting Range gold medal, all drone races and Bret\u2019s Target Decks — plus shares of the big counters. Nothing on it is missable.',
      ids: [14, 15, 17, 28, 30, 31, 32, 35, 40, 42, 43]
    },
    {
      title: 'Stage 3 — Side stories and clean-up',
      text: 'Stranger missions are not part of 100%, but Strangers & Freaks needs 8 strands, and several trophies come from character quest lines (Andy, Kenton, Billy, Randy, Tyrone, Bret). Finish those, then work down the checklist: robberies, money, exploration and the secret trophies.',
      ids: [16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 33, 34, 36, 37, 38, 39, 41, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55]
    }
  ];

  /* Suggested order for the "Next up" planner: story first, then the cheap
     activities, then the grinds. The first unearned trophy in this order wins. */
  var NEXT_UP_ORDER = [2, 3, 8, 10, 11, 12, 13, 4, 5, 6, 7, 9, 21, 16, 20, 28, 37, 38, 46, 41, 36, 39, 34, 33, 53, 55, 54, 19, 32, 35, 31, 30, 15, 17, 18, 22, 23, 24, 26, 27, 29, 25, 52, 40, 43, 42, 44, 45, 47, 48, 49, 50, 51, 14, 1];

  var KIND_LABELS = {
    story: 'Story', side: 'Side stories', activities: 'Activities',
    collectibles: 'Collectibles', robberies: 'Robberies', combat: 'Combat',
    money: 'Money & property', exploration: 'Exploration',
    secrets: 'Odd jobs & secrets', platinum: 'Platinum & 100%'
  };
  var GRADE_LABELS = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
  var GRADE_MARKS = { platinum: '\u25C6', gold: '\u25CF', silver: '\u25CF', bronze: '\u25CF' };

  var trophies = [];
  var byId = {};
  var earned = new Set();
  var notes = {};
  var selectedId = null;
  var showSpoilers = false;

  function $(id) { return document.getElementById(id); }

  function loadStored() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        JSON.parse(raw).forEach(function (id) { earned.add(Number(id)); });
      }
    } catch (e) { /* fresh start if storage is unreadable */ }
    try {
      var n = localStorage.getItem(NOTES_KEY);
      if (n) notes = JSON.parse(n) || {};
    } catch (e) { notes = {}; }
  }
  function saveStored() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(earned).sort(function (a, b) { return a - b; }))); } catch (e) {}
  }
  function saveNotes() {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); } catch (e) {}
  }
  function isMasked(t) {
    return t.story && !showSpoilers && !earned.has(t.id);
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---- progress, roadmap stages and the Next-up planner ---- */
  function renderProgress() {
    var total = trophies.length;
    var done = earned.size;
    var pct = total ? Math.round((done / total) * 100) : 0;
    $('progress-text').textContent = done + ' of ' + total + ' earned';
    $('progress-pct').textContent = pct + '%';
    $('bar-fill').style.width = pct + '%';
    $('bar').setAttribute('aria-valuenow', String(done));
    var grades = ['platinum', 'gold', 'silver', 'bronze'];
    $('grade-counts').innerHTML = grades.map(function (g) {
      var have = trophies.filter(function (t) { return t.grade === g && earned.has(t.id); }).length;
      var all = trophies.filter(function (t) { return t.grade === g; }).length;
      return '<span><b>' + have + '/' + all + '</b> ' + GRADE_LABELS[g] + '</span>';
    }).join('');
    var next = null;
    for (var i = 0; i < NEXT_UP_ORDER.length; i++) {
      if (!earned.has(NEXT_UP_ORDER[i])) { next = byId[NEXT_UP_ORDER[i]]; break; }
    }
    if (next) {
      $('nextup').innerHTML = '<b>Next up:</b> ' + esc(next.name) + ' — ' + esc(next.description) +
        ' <button type="button" id="nextup-open">Open its guide</button>';
      $('nextup-open').addEventListener('click', function () { selectTrophy(next.id, true); });
    } else {
      $('nextup').innerHTML = '<b>Platinum earned.</b> Every trophy on this list is ticked — Leonida Legend.';
    }
  }

  function renderRoadmap() {
    $('roadmap-steps').innerHTML = STAGES.map(function (s) {
      var done = s.ids.filter(function (id) { return earned.has(id); }).length;
      var pct = Math.round((done / s.ids.length) * 100);
      return '<li><strong>' + esc(s.title) + '</strong><br>' + esc(s.text) +
        '<div class="stage-bar"><div style="width:' + pct + '%"></div></div>' +
        '<span class="stage-count">' + done + ' of ' + s.ids.length + ' trophies in this stage earned (' + pct + '%)</span></li>';
    }).join('');
  }

  /* ---- checklist ---- */
  function trophyMatches(t) {
    var q = $('q').value.trim().toLowerCase();
    var kind = $('kind').value;
    var grade = $('grade').value;
    var status = $('status').value;
    if (kind !== 'all' && t.kind !== kind) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (status === 'earned' && !earned.has(t.id)) return false;
    if (status === 'remaining' && earned.has(t.id)) return false;
    if ($('missable-only').checked && !t.missable) return false;
    if (q) {
      var hay = (t.name + ' ' + t.description + ' ' + (t.guide || '') + ' ' + (KIND_LABELS[t.kind] || '')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function buildRow(t) {
    var row = document.createElement('div');
    row.className = 'row' + (earned.has(t.id) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
    row.setAttribute('data-id', String(t.id));
    var masked = isMasked(t);
    var name = masked ? 'Hidden trophy — story spoiler' : t.name;
    var desc = masked ? 'Earn this trophy (or switch “Show story spoilers” on) to reveal its name and description.' : t.description;
    var pills = '<span class="pill ' + t.grade + '">' + GRADE_LABELS[t.grade] + '</span>' +
      '<span class="pill">' + esc(KIND_LABELS[t.kind] || t.kind) + '</span>';
    if (t.hidden) pills += '<span class="pill hidden">Hidden on PSN</span>';
    if (t.missable) pills += '<span class="pill missable">\u26A0 Possibly missable</span>';
    if (t.confirmed === false) pills += '<span class="pill unconfirmed">Method unconfirmed</span>';
    if (t.confirmed === 'partial') pills += '<span class="pill unconfirmed">Partly unconfirmed</span>';
    if (t.countLabel) pills += '<span class="pill count">' + esc(t.countLabel) + '</span>';
    row.innerHTML =
      '<input type="checkbox" aria-label="Earned: ' + esc(name) + '"' + (earned.has(t.id) ? ' checked' : '') + '>' +
      '<div><div class="name' + (masked ? ' masked' : '') + '">' + esc(name) + '</div>' +
      '<div class="desc' + (masked ? ' masked' : '') + '">' + esc(desc) + '</div>' +
      '<div class="meta">' + pills + '</div></div>' +
      '<div class="grade-mark ' + t.grade + '" title="' + GRADE_LABELS[t.grade] + '">' + GRADE_MARKS[t.grade] + '</div>';
    row.querySelector('input').addEventListener('change', function (ev) {
      ev.stopPropagation();
      if (ev.target.checked) earned.add(t.id); else earned.delete(t.id);
      saveStored();
      renderAll();
      if (selectedId === t.id) renderDetail();
    });
    row.addEventListener('click', function (ev) {
      if (ev.target.tagName !== 'INPUT') selectTrophy(t.id, false);
    });
    return row;
  }

  function renderChecklist() {
    var list = $('checklist');
    list.innerHTML = '';
    var shown = 0;
    trophies.forEach(function (t) {
      if (!trophyMatches(t)) return;
      shown++;
      list.appendChild(buildRow(t));
    });
    $('showing').textContent = 'Showing ' + shown + ' of ' + trophies.length + ' trophies';
  }

  /* ---- detail pane: guide, sources, notes ---- */
  function sourceLinks(list) {
    return (list || []).map(function (name) {
      var url = SOURCES[name];
      return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(name) + '</a>' : esc(name);
    }).join(', ');
  }

  function renderDetail() {
    var pane = $('detail');
    var t = selectedId ? byId[selectedId] : null;
    if (!t) {
      pane.innerHTML = '<p class="detail-empty">Pick a trophy in the list to see its guide, sources and your notes here.</p>';
      return;
    }
    var masked = isMasked(t);
    var status = t.confirmed === false ? 'Method unconfirmed at launch — see the guide.' :
      t.confirmed === 'partial' ? 'Partly unconfirmed at launch — see the guide.' : '';
    pane.innerHTML =
      '<button type="button" class="close" id="detail-close">Close</button>' +
      '<h2>' + esc(masked ? 'Hidden trophy — story spoiler' : t.name) + '</h2>' +
      '<p class="official">Official: ' + esc(masked ? 'Hidden until earned.' : t.description) + '<br>' +
      GRADE_LABELS[t.grade] + ' &middot; ' + esc(KIND_LABELS[t.kind] || t.kind) +
      (t.hidden ? ' &middot; Hidden on PSN' : '') + (t.missable ? ' &middot; Possibly missable' : '') +
      (t.countLabel ? ' &middot; ' + esc(t.countLabel) : '') + '</p>' +
      (status ? '<p class="pill unconfirmed">' + esc(status) + '</p>' : '') +
      (earned.has(t.id) ? '<p class="earned-line">\u2713 Earned — ticked in your checklist.</p>' : '') +
      '<p class="guide-text">' + esc(t.guide) + '</p>' +
      '<p class="src">Sources: ' + sourceLinks(t.sources) + '. Guide text is this entry\u2019s own words.</p>' +
      '<label class="notes-label">Your notes for this trophy<textarea id="trophy-note" placeholder="e.g. best spot, loadout, what worked…">' + esc(notes[t.id] || '') + '</textarea></label>';
    $('detail-close').addEventListener('click', function () { selectedId = null; renderDetail(); renderChecklist(); });
    $('trophy-note').addEventListener('input', function (ev) {
      var v = ev.target.value.trim();
      if (v) notes[t.id] = v; else delete notes[t.id];
      saveNotes();
    });
  }

  function selectTrophy(id, scroll) {
    selectedId = id;
    renderChecklist();
    renderDetail();
    if (scroll) $('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderAll() {
    renderProgress();
    renderRoadmap();
    renderChecklist();
  }

  /* ---- export / import / reset ---- */
  function exportProgress() {
    var payload = {
      app: 'gta6-trophy-guide',
      version: 2,
      exportedAt: new Date().toISOString(),
      earned: Array.from(earned).sort(function (a, b) { return a - b; }),
      notes: notes
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gta6-trophy-progress.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function importProgress(file) {
    file.text().then(function (text) {
      var doc;
      try { doc = JSON.parse(text); } catch (e) { alert('That file is not valid JSON.'); return; }
      var ids = doc.earned || doc;
      if (!Array.isArray(ids)) { alert('That file has no earned-trophy list.'); return; }
      var valid = new Set(trophies.map(function (t) { return t.id; }));
      earned = new Set(ids.filter(function (id) { return valid.has(Number(id)); }).map(Number));
      if (doc.notes && typeof doc.notes === 'object') notes = doc.notes;
      saveStored();
      saveNotes();
      renderAll();
      renderDetail();
      alert('Imported ' + earned.size + ' earned trophies.');
    });
  }

  /* ---- boot ---- */
  function start() {
    var params = new URLSearchParams(window.location.search);
    loadStored();
    if (params.has('demo')) {
      earned = new Set(DEMO_IDS);
      saveStored();
    }
    if (params.get('spoilers') === 'on') showSpoilers = true;
    if (params.get('grade')) $('grade').value = params.get('grade');
    if (params.get('kind')) $('kind').value = params.get('kind');
    $('spoilers').checked = showSpoilers;

    ['q', 'kind', 'grade', 'status'].forEach(function (id) {
      $(id).addEventListener('input', renderChecklist);
      $(id).addEventListener('change', renderChecklist);
    });
    $('missable-only').addEventListener('change', renderChecklist);
    $('spoilers').addEventListener('change', function (ev) {
      showSpoilers = ev.target.checked;
      renderChecklist();
      renderDetail();
    });
    $('export').addEventListener('click', exportProgress);
    $('import').addEventListener('change', function (ev) {
      if (ev.target.files && ev.target.files[0]) importProgress(ev.target.files[0]);
      ev.target.value = '';
    });
    $('reset').addEventListener('click', function () {
      if (confirm('Clear all earned trophies and notes?')) {
        earned = new Set();
        notes = {};
        saveStored();
        saveNotes();
        renderAll();
        renderDetail();
      }
    });

    var srcList = $('sources');
    srcList.innerHTML = Object.keys(SOURCES).map(function (name) {
      return '<li><a href="' + esc(SOURCES[name]) + '" target="_blank" rel="noopener">' + esc(name) + '</a> — ' + esc(SOURCES[name]) + '</li>';
    }).join('');

    renderAll();
    if (params.has('open')) {
      var id = Number(params.get('open'));
      if (byId[id]) selectTrophy(id, true);
    } else if (params.has('demo')) {
      selectTrophy(28, false);
    }
    if (window.location.hash === '#roadmap') {
      document.getElementById('roadmap').scrollIntoView();
    }
  }

  fetch('data/trophies.json')
    .then(function (r) { return r.json(); })
    .then(function (doc) {
      trophies = doc.trophies;
      trophies.forEach(function (t) { byId[t.id] = t; });
      start();
    })
    .catch(function () {
      document.getElementById('checklist').innerHTML =
        '<p>Could not load data/trophies.json. Serve the app/ folder with a static server (for example <code>node serve.ts</code>) instead of opening the file directly.</p>';
    });
})();
