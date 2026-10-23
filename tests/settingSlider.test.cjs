const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const load = require('./loadSource.cjs');

test('volume slider supports dragging, mute, maximum, and screen-reader adjustment', () => {
  let width = 0, handlers;
  const ref = { current: null };
  const changes = [];
  const Slider = load('src/components/SettingSlider.js', {
    react: { ...React, useState: () => [width, value => { width = value; }], useRef: () => ref, useMemo: fn => fn() },
    'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: styles => styles },
      PanResponder: { create: value => { handlers = value; return { panHandlers: {} }; } } },
  }).default;
  const props = { value: 70, minimum: 0, maximum: 100, step: 5, onChange: value => changes.push(value),
    label: 'Alarm volume', formatValue: value => `${value}%`, ticks: [0, 25, 50, 75, 100] };
  let tree = Slider(props);
  tree.props.children[1].props.onLayout({ nativeEvent: { layout: { width: 352 } } });
  tree = Slider(props);
  for (const locationX of [16, 96, 176, 500]) handlers.onPanResponderMove({ nativeEvent: { locationX } });
  assert.deepEqual(changes, [0, 25, 50, 100]);
  const control = tree.props.children[1].props;
  assert.equal(control.accessibilityRole, 'adjustable');
  assert.equal(control.accessibilityValue.text, '70%');
  control.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  control.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });
  assert.deepEqual(changes.slice(-2), [75, 65]);
});
