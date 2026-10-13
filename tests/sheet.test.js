// Tests for sheet.js (indlæsning af CSV fra Google Sheets). Kør med:  node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Sheet = require('../sheet.js');
const { computeStandings } = require('../ranking.js');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'data', f), 'utf8');

test('parseCSV håndterer citerede felter, komma og CRLF', () => {
  assert.deepEqual(Sheet.parseCSV('"a","b, c"\r\n"d ""e""",f\n'), [['a', 'b, c'], ['d "e"', 'f']]);
});

test('CSV-filerne i data/ kan læses og giver et komplet kampprogram', () => {
  const teams = Sheet.parseTeams(read('Hold.csv'));
  const matches = Sheet.parseMatches(read('Kampe.csv'));
  assert.equal(teams.length, 6);
  assert.equal(matches.length, 15);
  assert.ok(matches.every((m) => !m.played));
  // Hvert par mødes præcis én gang
  const pairs = new Set(matches.map((m) => [m.home, m.away].sort().join('-')));
  assert.equal(pairs.size, 15);
  const slots = Sheet.groupSlots(matches, teams);
  assert.equal(slots.length, 8);
  assert.deepEqual(slots[0].sittingOut, [3, 4]);
  assert.deepEqual(slots[7].sittingOut, [1, 2, 5, 6]);
  assert.deepEqual(slots[0].range, { start: 600, end: 630 });
});

test('gviz-lignende CSV med rod: citater, mellemrum, tomme rækker, flyttede kolonner', () => {
  const holdCsv = '"HoldID","Holdnavn"\n" 1 ","  Nørrebro United KitKats "\n"",""\n"2","FA 2000"\n"x","Rod"\n';
  const kampeCsv = [
    '"","",""', // tom række før overskrifterne
    '"Tid","KampNr","Bane","HjemmeID","UdeID","Hjemme Mål","UdeMål"',
    '"10:00 - 10:30","1","Bane 1"," 1","2 ","3","1"',
    '"","","","","","",""',
    '"10:30–11:00","2","Bane 1","2","1","2",""',
  ].join('\n');
  const teams = Sheet.parseTeams(holdCsv);
  assert.deepEqual(teams, [{ id: 1, name: 'Nørrebro United KitKats' }, { id: 2, name: 'FA 2000' }]);
  const matches = Sheet.parseMatches(kampeCsv);
  assert.equal(matches.length, 2);
  assert.equal(matches[0].played, true);
  assert.equal(matches[1].played, false);
  const rows = computeStandings(teams, matches);
  assert.equal(rows[0].name, 'Nørrebro United KitKats');
  assert.equal(rows[0].points, 3);
  assert.equal(rows[1].played, 1);
});

test('manglende kolonner giver en forståelig fejl', () => {
  assert.throws(() => Sheet.parseTeams('Foo,Bar\n1,2'), /HoldID, Holdnavn/);
});
