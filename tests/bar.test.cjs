const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Model = vm.createContext({ Date });
vm.runInContext(fs.readFileSync('Model.js', 'utf8'), Model);
const B = vm.createContext({ Model, Date });
vm.runInContext(fs.readFileSync('ui/BarModel.js', 'utf8').replace(/^\.import.*$/gm, ''), B);
const at = (h, m = 0) => new Date(2026, 9, 21, h, m).getTime();
const timed = (id, h, m = 0, props = {}) => ({ id, content: id, project_id: 'work', priority: 1, due: { date: `2026-10-21T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00` }, ...props });
const shown = (mode, tasks, now) => B.label(B.selection(mode, tasks, 'me', now), now);

test('Soon names a task from 15 minutes before its time until it ends', () => {
    const tasks = [timed('Review designs', 10, 0, { duration: { amount: 30, unit: 'minute' } })];
    assert.equal(shown('soon', tasks, at(9, 44)), '');
    assert.equal(shown('soon', tasks, at(9, 48)), 'Review designs · in 12m');
    assert.equal(shown('soon', tasks, at(10, 5)), 'Review designs · until 10:30');
    assert.equal(shown('soon', tasks, at(10, 30)), '');
});

test('A task without a duration says now for half an hour', () => {
    const tasks = [timed('Call Ana', 10)];
    assert.equal(shown('soon', tasks, at(10, 10)), 'Call Ana · now');
    assert.equal(shown('soon', tasks, at(10, 30)), '');
});

test('An imminent task comes before one under way, with a count of the rest', () => {
    const tasks = [timed('Long meeting', 9, 0, { duration: { amount: 120, unit: 'minute' } }), timed('Call Ana', 10)];
    assert.equal(shown('soon', tasks, at(9, 50)), 'Call Ana · in 10m  +1');
});

test('Next always names today’s next timed task; count and icon name none', () => {
    const tasks = [timed('Lunch', 13), { id: 'untimed', content: 'untimed', due: { date: '2026-10-21' } }, timed('Other person', 12, 0, { responsible_uid: 'other' })];
    assert.equal(shown('soon', tasks, at(9)), '');
    assert.equal(shown('next', tasks, at(9)), 'Lunch · at 13:00');
    assert.equal(shown('count', tasks, at(12, 50)), '');
    assert.equal(shown('icon', tasks, at(12, 50)), '');
    assert.equal(B.mode('bogus'), 'soon');
});

test('Long names are shortened for the bar but not the tooltip', () => {
    const name = 'Prepare the quarterly planning document for the team';
    const list = B.selection('soon', [timed(name, 10)], 'me', at(10));
    assert.equal(B.label(list, at(10)), 'Prepare the quarterly plann… · now');
    assert.equal(B.tooltip(list, at(10)), name + ' · now');
});
