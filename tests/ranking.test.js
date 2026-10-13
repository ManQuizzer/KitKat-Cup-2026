// Tests for ranking.js. Kør med:  node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeStandings, toCount } = require('../ranking.js');

// Hjælpere: T('A','B') giver hold med ID 1, 2, ...; M(hjemme, ude, hjemmeMål, udeMål)
const T = (...names) => names.map((name, i) => ({ id: i + 1, name }));
const M = (home, away, homeGoals, awayGoals) => ({ home, away, homeGoals, awayGoals });
const summary = (rows) => rows.map((r) => [r.position, r.name]);

test('sejr 3, uafgjort 1, nederlag 0 – flest point øverst', () => {
  // A–B 2–0, B–C 1–1 → A 3, B 1, C 1
  const rows = computeStandings(T('A', 'B', 'C'), [M(1, 2, 2, 0), M(2, 3, 1, 1)]);
  assert.deepEqual(rows.map((r) => [r.name, r.played, r.won, r.drawn, r.lost, r.goalsFor, r.goalsAgainst, r.goalDiff, r.points]), [
    ['A', 1, 1, 0, 0, 2, 0, 2, 3],
    ['C', 1, 0, 1, 0, 1, 1, 0, 1], // C over B: uafgjort indbyrdes, bedre målforskel
    ['B', 2, 0, 1, 1, 1, 3, -2, 1],
  ]);
});

test('to hold på lige point afgøres indbyrdes (selv med dårligere målforskel)', () => {
  const rows = computeStandings(T('A', 'B', 'C', 'D'), [
    M(1, 2, 1, 0), // A slår B
    M(2, 3, 9, 0), // B slår C stort
    M(4, 1, 1, 0), // D slår A
    M(4, 3, 1, 0), // D slår C
  ]);
  // A og B har 3 point. B har klart bedst målforskel, men A vandt indbyrdes.
  assert.deepEqual(summary(rows), [[1, 'D'], [2, 'A'], [3, 'B'], [4, 'C']]);
  assert.ok(rows[2].goalDiff > rows[1].goalDiff);
});

test('to hold lige og uafgjort indbyrdes → målforskel i alle kampe', () => {
  const rows = computeStandings(T('A', 'B', 'C'), [
    M(1, 2, 2, 2), // A–B uafgjort
    M(1, 3, 1, 0), // A +1 i alt
    M(2, 3, 4, 0), // B +4 i alt
  ]);
  assert.deepEqual(summary(rows), [[1, 'B'], [2, 'A'], [3, 'C']]);
});

test('to hold lige, men ikke mødt hinanden endnu → målforskel', () => {
  const rows = computeStandings(T('A', 'B', 'C'), [M(1, 3, 1, 0), M(2, 3, 3, 0)]);
  assert.deepEqual(summary(rows), [[1, 'B'], [2, 'A'], [3, 'C']]);
});

test('lige målforskel → flest scorede mål i alle kampe', () => {
  const rows = computeStandings(T('A', 'B', 'C'), [
    M(1, 2, 1, 1), // A–B uafgjort
    M(1, 3, 2, 1), // A: 3–2 i alt (+1)
    M(2, 3, 5, 4), // B: 6–5 i alt (+1)
  ]);
  assert.deepEqual(summary(rows), [[1, 'B'], [2, 'A'], [3, 'C']]);
  assert.equal(rows[0].goalDiff, rows[1].goalDiff);
});

test('helt lige → delt placering med samme nummer, alfabetisk (æ/ø/å til sidst)', () => {
  const rows = computeStandings(T('Øster', 'Bøf', 'Amager'), [M(1, 2, 1, 1)]);
  assert.deepEqual(summary(rows), [[1, 'Bøf'], [1, 'Øster'], [3, 'Amager']]);
  assert.equal(rows[0].shared, true);
  assert.equal(rows[2].shared, false);
});

test('tre hold på lige point i en cirkel → målforskel, derefter scorede mål', () => {
  // A slår B, B slår C, C slår A: minitabellen giver alle 3 point → afgøres på mål.
  const rows = computeStandings(T('A', 'B', 'C'), [
    M(1, 2, 1, 0),
    M(2, 3, 3, 0),
    M(3, 1, 2, 0),
  ]);
  // Målforskel: B +2, A -1 (1 scoret), C -1 (2 scoret)
  assert.deepEqual(summary(rows), [[1, 'B'], [2, 'C'], [3, 'A']]);
});

test('tre hold i en cirkel med helt ens tal → delt 1. plads, alfabetisk', () => {
  const rows = computeStandings(T('C', 'A', 'B'), [M(1, 2, 1, 0), M(2, 3, 1, 0), M(3, 1, 1, 0)]);
  assert.deepEqual(summary(rows), [[1, 'A'], [1, 'B'], [1, 'C']]);
});

test('tre lige hold: minitabel adskiller kun ét → de to andre vurderes forfra indbyrdes', () => {
  // A, B og C får 3 point hver.
  //   A–B 1–0, B–C 5–0, C–D 9–0  (A og C har ikke mødt hinanden)
  // Minitabel (A,B,C): A 3, B 3, C 0 → C sidst af de tre.
  // {A,B} vurderes igen fra a) kun indbyrdes: A slog B → A over B,
  // selvom B har bedre målforskel (+4 mod +1).
  const rows = computeStandings(T('A', 'B', 'C', 'D'), [
    M(1, 2, 1, 0),
    M(2, 3, 5, 0),
    M(3, 4, 9, 0),
  ]);
  assert.deepEqual(summary(rows), [[1, 'A'], [2, 'B'], [3, 'C'], [4, 'D']]);
  assert.deepEqual(rows.map((r) => r.goalDiff), [1, 4, 4, -9]);
});

test('ingen kampe spillet endnu → alle 0 point, delt 1. plads, alfabetisk', () => {
  const teams = [
    { id: 1, name: 'Nørrebro United KitKats' }, { id: 2, name: 'FA 2000' }, { id: 3, name: 'FB' },
    { id: 4, name: 'Pioneren U10' }, { id: 5, name: 'Hellas' }, { id: 6, name: 'B93' },
  ];
  const rows = computeStandings(teams, [M(1, 2, '', ''), M(5, 6, null, undefined)]);
  assert.deepEqual(rows.map((r) => r.name),
    ['B93', 'FA 2000', 'FB', 'Hellas', 'Nørrebro United KitKats', 'Pioneren U10']);
  assert.ok(rows.every((r) => r.position === 1 && r.points === 0 && r.played === 0));
});

test('ugyldige/tomme celler ignoreres; tal som tekst og mellemrum tolereres', () => {
  const teams = [
    { id: ' 1 ', name: ' A ' }, { id: '2', name: 'B' }, { id: 3, name: 'C' },
    { id: '', name: 'Tom' }, { id: 'x', name: 'Rod' },
  ];
  const rows = computeStandings(teams, [
    M(' 1', '2 ', ' 3 ', '1'), // gyldig: A–B 3–1 (tal som tekst med mellemrum)
    M(1, 3, '2', ''),          // kun ét felt udfyldt → tæller ikke
    M(2, 3, 'x', '1'),         // tekst → tæller ikke
    M(2, 3, '-1', '0'),        // negativt → tæller ikke
    M(2, 3, '1.5', '0'),       // decimaltal → tæller ikke
    M(2, 3, '2-1', ''),        // resultat skrevet i én celle → tæller ikke
    M(2, 9, 1, 0),             // ukendt hold → tæller ikke
    M(2, 2, 1, 0),             // samme hold på begge sider → tæller ikke
    M('', 3, 1, 0),            // tomt hold-ID → tæller ikke
    null,                      // tom række
    M(3, 2, '2,0', 2.0),       // "2,0" og 2.0 accepteres: C–B 2–2
  ]);
  assert.deepEqual(rows.map((r) => [r.position, r.name, r.played, r.points, r.goalsFor, r.goalsAgainst]), [
    [1, 'A', 1, 3, 3, 1],
    [2, 'C', 1, 1, 2, 2],
    [3, 'B', 2, 1, 3, 5],
  ]);
});

test('toCount læser tal robust', () => {
  assert.equal(toCount(' 4 '), 4);
  assert.equal(toCount('0'), 0);
  assert.equal(toCount(3), 3);
  assert.equal(toCount('3,0'), 3);
  assert.equal(toCount(' 12 '), 12);
  for (const bad of ['', '  ', 'abc', -2, 1.5, null, undefined, '1 2']) {
    assert.equal(toCount(bad), null, String(bad));
  }
});
