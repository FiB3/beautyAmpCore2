# BEAUTY AMP CORE

This library gives you the option to format AMPscript code used in SFMC.

## Installation

```
> npm install --save beauty-amp-core
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
console.log(result); // returns code as an array
```

### beautify(lines)
Format code. Lines are broken on `"\n"`.  
`lines`: __Array|String__ - text of your code  
`return`: __{Array|String}__ Formatted code. Array or string based on the initial input.

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