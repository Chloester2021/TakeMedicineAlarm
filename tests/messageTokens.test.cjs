const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadSource.cjs');
const { tokenText } = load('src/utils/alarm.js');

test('adjacent saved placeholders resolve with spaces in every order', () => {
  const date = new Date(2026, 9, 22, 17, 4);
  for (const left of ['time', 'date', 'day']) {
    for (const right of ['time', 'date', 'day']) {
      assert.equal(tokenText(`{${left}}{${right}}`, date),
        `${tokenText(`{${left}}`, date)} ${tokenText(`{${right}}`, date)}`);
    }
  }
});

test('resolving placeholders preserves explicit separators and ordinary prose', () => {
  const date = new Date(2026, 9, 22, 17, 4);
  for (const separator of [' ', '  ', ', ', '\n', ' at ']) {
    assert.equal(tokenText(`{date}${separator}{time}!`, date),
      `${tokenText('{date}', date)}${separator}${tokenText('{time}', date)}!`);
  }
});
