# BEAUTY AMP CORE

This library gives you the option to format AMPscript code used in SFMC.

## Installation

```
> npm install readme -g
```

## Usage

``` javascript
const beautifier = require('beauty-amp-core');

beautifier.setup(undefined, undefined, {
  loggerOn: false
});

let lines = [`<h1>My Test Case:</h1>`,
`%%[ VAR @lang `,
`If (@lang == 'EN') then Output("Hello World!")`,
`Else`,
`	Output("Ciao!")`,
`endif`,
`]%%`];

const result = beautifier.beautify(lines);
console.log(result);
```

## Setup

Defaults:
``` javascript
// immutable at the moment:
const ampscript = {
  capitalizeAndOrNot:true,
  capitalizeIfFor:true,
  capitalizeSet:true,
  capitalizeVar:true,
  maxParametersPerLine: 4
};
// immutable at the moment:
const editor = {
  insertSpaces: true,
  tabSize: 4
};
// logs trough console only for the moment.
const logs = {
  loggerOn: true // <= disable logging
};

beautifier.setup(ampscript, editor, logs);
```