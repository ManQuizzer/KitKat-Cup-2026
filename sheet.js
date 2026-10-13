/*
 * sheet.js – læser CSV fra Google Sheets og gør data klar til siden.
 * Tolererer rod i arket: ekstra mellemrum, tomme rækker, tal skrevet som tekst
 * og kolonner i en anden rækkefølge (kolonner findes via overskrifterne).
 * Virker både i browseren (window.Sheet) og i Node (require('./sheet.js')).
 */
(function (root) {
  'use strict';

  var toCount = (typeof module !== 'undefined' && module.exports)
    ? require('./ranking.js').toCount
    : root.Ranking.toCount;

  /** Simpel CSV-parser med understøttelse af "citerede" felter. */
  function parseCSV(text) {
    text = String(text || '').replace(/^\ufeff/, '');
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function normHeader(h) {
    return String(h || '').toLowerCase().replace(/[\s_\-.]/g, '');
  }

  function clean(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  }

  /**
   * Finder overskriftsrækken (den første række, der indeholder alle `required`
   * kolonner) og returnerer resten som objekter med pæne nøgler.
   * `columns` = { nøgle: 'Overskrift i arket' }.
   */
  function rowsToObjects(rows, columns) {
    var keys = Object.keys(columns);
    var wanted = keys.map(function (k) { return normHeader(columns[k]); });
    for (var r = 0; r < rows.length; r++) {
      var headers = rows[r].map(normHeader);
      var idx = wanted.map(function (w) { return headers.indexOf(w); });
      if (idx.indexOf(-1) !== -1) continue;
      var out = [];
      for (var i = r + 1; i < rows.length; i++) {
        var obj = {};
        var empty = true;
        keys.forEach(function (k, j) {
          obj[k] = clean(rows[i][idx[j]]);
          if (obj[k] !== '') empty = false;
        });
        if (!empty) out.push(obj);
      }
      return out;
    }
    throw new Error('Kunne ikke finde kolonnerne: ' + keys.map(function (k) { return columns[k]; }).join(', '));
  }

  function parseTeams(csv) {
    var seen = {};
    return rowsToObjects(parseCSV(csv), { id: 'HoldID', name: 'Holdnavn' })
      .map(function (t) { return { id: toCount(t.id), name: t.name }; })
      .filter(function (t) {
        if (t.id === null || seen[t.id]) return false;
        seen[t.id] = true;
        return true;
      });
  }

  function parseMatches(csv) {
    return rowsToObjects(parseCSV(csv), {
      no: 'KampNr', time: 'Tid', pitch: 'Bane', home: 'HjemmeID',
      away: 'UdeID', homeGoals: 'HjemmeMål', awayGoals: 'UdeMål'
    }).map(function (m) {
      var hg = toCount(m.homeGoals);
      var ag = toCount(m.awayGoals);
      return {
        no: toCount(m.no), time: m.time, pitch: m.pitch,
        home: toCount(m.home), away: toCount(m.away),
        homeGoals: hg, awayGoals: ag,
        played: hg !== null && ag !== null
      };
    }).filter(function (m) { return m.home !== null && m.away !== null; });
  }

  /** "10:00–10:30" → { start: 600, end: 630 } (minutter efter midnat) eller null. */
  function parseSlot(time) {
    var m = /(\d{1,2})[:.](\d{2})\s*[–—\-]\s*(\d{1,2})[:.](\d{2})/.exec(time || '');
    if (!m) return null;
    return { start: +m[1] * 60 + +m[2], end: +m[3] * 60 + +m[4] };
  }

  /**
   * Grupperer kampene efter tidsslot (sorteret efter starttid) og beregner,
   * hvilke hold der sidder over i hvert slot.
   */
  function groupSlots(matches, teams) {
    var map = {};
    var slots = [];
    matches.forEach(function (m) {
      var key = (m.time || '').replace(/\s/g, '').replace(/[—\-]/g, '–');
      if (!map[key]) {
        map[key] = { key: key, label: m.time || 'Uden tid', range: parseSlot(m.time), matches: [] };
        slots.push(map[key]);
      }
      map[key].matches.push(m);
    });
    slots.forEach(function (s) {
      s.matches.sort(function (a, b) {
        return a.pitch.localeCompare(b.pitch, 'da', { numeric: true }) || (a.no || 0) - (b.no || 0);
      });
      var playing = {};
      s.matches.forEach(function (m) { playing[m.home] = true; playing[m.away] = true; });
      s.sittingOut = teams.filter(function (t) { return !playing[t.id]; }).map(function (t) { return t.id; });
    });
    slots.sort(function (a, b) {
      var sa = a.range ? a.range.start : Infinity;
      var sb = b.range ? b.range.start : Infinity;
      return sa - sb || (a.matches[0].no || 0) - (b.matches[0].no || 0);
    });
    return slots;
  }

  var api = {
    parseCSV: parseCSV, rowsToObjects: rowsToObjects, parseTeams: parseTeams,
    parseMatches: parseMatches, parseSlot: parseSlot, groupSlots: groupSlots
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Sheet = api;
})(typeof self !== 'undefined' ? self : this);
