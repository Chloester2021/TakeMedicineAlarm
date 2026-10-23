const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

// Exercise the app's actual ES modules with platform APIs replaced at the edge.
module.exports = function loadSource(filename, mocks = {}) {
  const absolute = path.resolve(filename);
  const code = babel.transformSync(fs.readFileSync(absolute, 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  const localRequire = id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith('.')) return loadSource(path.resolve(path.dirname(absolute), `${id}.js`), mocks);
    return require(id);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
};
