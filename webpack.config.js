const path = require('path');

module.exports = {
  target: 'node',
  entry: './beauty-amp-core.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'beauty-amp-core.js',
    globalObject: 'this',
    library: {
      name: 'beauty-amp-core2',
      type: 'umd',
    },
  },
};