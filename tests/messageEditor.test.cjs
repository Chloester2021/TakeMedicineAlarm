const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadSource.cjs');

function editor(initial) {
  let value = initial;
  let cursor = 0;
  const hooks = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
    Fragment: 'Fragment',
    useRef: initial => hooks[cursor++] ||= { current: initial },
    useState: initial => [initial, () => {}],
    useLayoutEffect() {},
  };
  const MessageEditor = load('src/components/MessageEditor.js', {
    react,
    'react-native': { View: 'View', Text: 'Text', TextInput: 'TextInput', TouchableOpacity: 'Button', StyleSheet: { create: value => value } },
  }).default;
  const render = () => {
    cursor = 0;
    const tree = MessageEditor({ value, onChange: next => { value = next; } });
    const nodes = [];
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      nodes.push(node);
      node.children.forEach(visit);
    };
    visit(tree);
    return nodes;
  };
  return { render, value: () => value };
}

test('existing placeholders render as outlined removable chips, outside editable text', () => {
  const ui = editor('Today is {day}, {date} at {time}.');
  const nodes = ui.render();
  assert.deepEqual(nodes.filter(node => node.type === 'TextInput').map(node => node.props.value), ['Today is ', ', ', ' at ', '.']);
  assert.deepEqual(nodes.filter(node => node.props.accessibilityLabel?.startsWith('Remove')).map(node => node.props.accessibilityLabel), [
    'Remove day from message', 'Remove date from message', 'Remove time from message',
  ]);
});

test('inserting a chip replaces selected prose at the cursor and preserves other tokens', () => {
  const ui = editor('Hello world {time}');
  const nodes = ui.render();
  nodes.find(node => node.type === 'TextInput').props.onSelectionChange({ nativeEvent: { selection: { start: 6, end: 11 } } });
  nodes.find(node => node.props.accessibilityLabel === 'Insert day').props.onPress();
  assert.equal(ui.value(), 'Hello {day} {time}');
});

test('editing prose and backspacing next to a token keep the token intact', () => {
  const ui = editor('{day} morning');
  let nodes = ui.render();
  let input = nodes.filter(node => node.type === 'TextInput')[1];
  input.props.onChangeText(' evening');
  assert.equal(ui.value(), '{day} evening');
  nodes = ui.render();
  input = nodes.filter(node => node.type === 'TextInput')[1];
  input.props.onSelectionChange({ nativeEvent: { selection: { start: 0, end: 0 } } });
  input.props.onKeyPress({ nativeEvent: { key: 'Backspace' } });
  assert.equal(ui.value(), '{day} evening');
});

test('explicit removal deletes only the chosen chip and merges surrounding prose', () => {
  const ui = editor('Today {day}{date}{time}!');
  ui.render().find(node => node.props.accessibilityLabel === 'Remove date from message').props.onPress();
  assert.equal(ui.value(), 'Today {day}{time}!');
  ui.render().find(node => node.props.accessibilityLabel === 'Remove day from message').props.onPress();
  assert.equal(ui.value(), 'Today {time}!');
});

test('pasted placeholders become chips and ordinary braces remain editable', () => {
  const ui = editor('');
  ui.render().find(node => node.type === 'TextInput').props.onChangeText('Hi {day}\n{date} {time} {name}');
  const nodes = ui.render();
  assert.equal(nodes.filter(node => node.props.accessibilityLabel?.startsWith('Remove')).length, 3);
  assert.ok(nodes.filter(node => node.type === 'TextInput').some(node => node.props.value.includes('{name}')));
});

test('caret restoration targets editable text after a token and handles message boundaries', () => {
  const { messageParts, messageCaret } = load('src/utils/messageTokens.js');
  const parts = messageParts('{day}{date} end');
  assert.deepEqual(messageCaret(parts, 5), { index: 2, position: 0 });
  assert.deepEqual(messageCaret(parts, 11), { index: 4, position: 0 });
  assert.deepEqual(messageCaret(parts, 999), { index: 4, position: 4 });
  assert.deepEqual(messageCaret(messageParts(''), 0), { index: 0, position: 0 });
});

test('inserting next to tokens separates both boundaries and preserves punctuation', () => {
  const ui = editor('{time}{day}!');
  const nodes = ui.render();
  nodes.filter(node => node.type === 'TextInput')[1].props.onSelectionChange({ nativeEvent: { selection: { start: 0, end: 0 } } });
  nodes.find(node => node.props.accessibilityLabel === 'Insert date').props.onPress();
  assert.equal(ui.value(), '{time} {date} {day}!');
});

test('inserting beside an existing separator does not add spaces', () => {
  const ui = editor('{time}, ');
  const nodes = ui.render();
  nodes.filter(node => node.type === 'TextInput')[1].props.onSelectionChange({ nativeEvent: { selection: { start: 2, end: 2 } } });
  nodes.find(node => node.props.accessibilityLabel === 'Insert date').props.onPress();
  assert.equal(ui.value(), '{time}, {date}');
});
