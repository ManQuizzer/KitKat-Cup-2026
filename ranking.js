/*
 * ranking.js – beregner stillingen for Nørrebro X KitKat MiniCup.
 *
 * Ren funktion uden sideeffekter: samme input giver altid samme output.
 * Virker både i browseren (window.Ranking) og i Node (require('./ranking.js')).
 *
 * Rangering:
 *   Sejr 3 point, uafgjort 1, nederlag 0. Ved pointlighed:
 *   a) Indbyrdes kampe (minitabel med kun spillede kampe mellem de pointlige hold).
 *      Adskiller minitabellen kun nogle af holdene, vurderes de resterende lige
 *      hold igen fra trin a) indbyrdes mellem sig.
 *   b) Størst målforskel i alle kampe.
 *   c) Flest scorede mål i alle kampe.
 *   d) Delt placering (samme placeringsnummer), sorteret alfabetisk.
 */
(function (root) {
  'use strict';

  var POINTS_WIN = 3;
  var POINTS_DRAW = 1;

  /**
   * Læser et ikke-negativt heltal fra en celle. Tolererer mellemrum, tal
   * skrevet som tekst og "3,0"/"3.0". Returnerer null for tomme eller
   * ugyldige værdier (fx "x", "-1", "2-1", "1.5").
   */
  function toCount(value) {
    if (typeof value === 'number') {
      return Number.isInteger(value) && value >= 0 ? value : null;
    }
    if (typeof value !== 'string') return null;
    var s = value.replace(/^[\s\u200b\ufeff]+|[\s\u200b\ufeff]+$/g, '');
    var m = /^(\d+)(?:[.,]0+)?$/.exec(s);
    return m ? parseInt(m[1], 10) : null;
  }

  function compareNames(a, b) {
    return a.name.localeCompare(b.name, 'da', { sensitivity: 'base' }) ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  }

  /** Splitter en (sorteret) liste i grupper med samme nøgleværdi. */
  function splitBy(list, keyFn) {
    var sorted = list.slice().sort(function (a, b) { return keyFn(b) - keyFn(a); });
    var groups = [];
    sorted.forEach(function (item) {
      var last = groups[groups.length - 1];
      if (last && keyFn(last[0]) === keyFn(item)) last.push(item);
      else groups.push([item]);
    });
    return groups;
  }

  /** Point i en minitabel med kun kampe mellem holdene i `group`. */
  function miniPoints(group, played) {
    var ids = {};
    var pts = {};
    group.forEach(function (t) { ids[t.id] = true; pts[t.id] = 0; });
    played.forEach(function (m) {
      if (!ids[m.home] || !ids[m.away]) return;
      if (m.homeGoals > m.awayGoals) pts[m.home] += POINTS_WIN;
      else if (m.homeGoals < m.awayGoals) pts[m.away] += POINTS_WIN;
      else { pts[m.home] += POINTS_DRAW; pts[m.away] += POINTS_DRAW; }
    });
    return pts;
  }

  /**
   * Afgør rækkefølgen inden for en gruppe af pointlige hold.
   * Returnerer en liste af "trin" – hvert trin er en liste af hold, der deler
   * placering (oftest ét hold pr. trin).
   */
  function resolveTie(group, played) {
    if (group.length === 1) return [group];

    // a) Indbyrdes kampe
    var pts = miniPoints(group, played);
    var byMini = splitBy(group, function (t) { return pts[t.id]; });
    if (byMini.length > 1) {
      // Minitabellen adskilte (nogle af) holdene: hver restgruppe vurderes forfra fra a)
      var tiers = [];
      byMini.forEach(function (sub) { tiers = tiers.concat(resolveTie(sub, played)); });
      return tiers;
    }

    // b) Målforskel i alle kampe, c) scorede mål i alle kampe, d) delt + alfabetisk
    var result = [];
    splitBy(group, function (t) { return t.goalDiff; }).forEach(function (byGd) {
      splitBy(byGd, function (t) { return t.goalsFor; }).forEach(function (byGf) {
        result.push(byGf.slice().sort(compareNames));
      });
    });
    return result;
  }

  /**
   * Beregner stillingen.
   *
   * @param {Array<{id:*, name:string}>} teams
   * @param {Array<{home:*, away:*, homeGoals:*, awayGoals:*}>} matches
   *   Værdierne må være tal eller tekst. Kampe med tomme/ugyldige mål,
   *   ukendte hold eller samme hold på begge sider ignoreres.
   * @returns {Array<{position:number, id:number, name:string, played:number,
   *   won:number, drawn:number, lost:number, goalsFor:number,
   *   goalsAgainst:number, goalDiff:number, points:number, shared:boolean}>}
   */
  function computeStandings(teams, matches) {
    var table = {};
    var order = [];
    (teams || []).forEach(function (t) {
      var id = toCount(t && t.id);
      if (id === null || table[id]) return;
      var name = String((t && t.name) == null ? '' : t.name).trim() || ('Hold ' + id);
      table[id] = {
        id: id, name: name, played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0
      };
      order.push(table[id]);
    });

    var played = [];
    (matches || []).forEach(function (m) {
      if (!m) return;
      var home = toCount(m.home);
      var away = toCount(m.away);
      var hg = toCount(m.homeGoals);
      var ag = toCount(m.awayGoals);
      if (home === null || away === null || hg === null || ag === null) return;
      if (home === away || !table[home] || !table[away]) return;
      played.push({ home: home, away: away, homeGoals: hg, awayGoals: ag });
    });

    played.forEach(function (m) {
      var h = table[m.home];
      var a = table[m.away];
      h.played++; a.played++;
      h.goalsFor += m.homeGoals; h.goalsAgainst += m.awayGoals;
      a.goalsFor += m.awayGoals; a.goalsAgainst += m.homeGoals;
      if (m.homeGoals > m.awayGoals) { h.won++; a.lost++; h.points += POINTS_WIN; }
      else if (m.homeGoals < m.awayGoals) { a.won++; h.lost++; a.points += POINTS_WIN; }
      else { h.drawn++; a.drawn++; h.points += POINTS_DRAW; a.points += POINTS_DRAW; }
    });
    order.forEach(function (t) { t.goalDiff = t.goalsFor - t.goalsAgainst; });

    var tiers = [];
    splitBy(order, function (t) { return t.points; }).forEach(function (group) {
      tiers = tiers.concat(resolveTie(group, played));
    });

    var rows = [];
    tiers.forEach(function (tier) {
      var position = rows.length + 1;
      tier.forEach(function (t) {
        var row = Object.assign({}, t);
        row.position = position;
        row.shared = tier.length > 1;
        rows.push(row);
      });
    });
    return rows;
  }

  var api = { computeStandings: computeStandings, toCount: toCount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Ranking = api;
})(typeof self !== 'undefined' ? self : this);
