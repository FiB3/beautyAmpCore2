# Beauty AMP Core 2

This library gives you the option to format AMPscript code used in SFMC.  
Includes HTML formatting using Prettier.  
Duplicated to ensure support of the original library.

## Installation

```
> npm install --save beauty-amp-core2
```

## Usage

``` javascript
const beautifier = require('beauty-amp-core2');

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

const result = await beautifier.beautify(lines);
console.log(result); // returns code as an array
```

### beautify(lines)
Format code. Lines are broken on `"\n"`.  
`lines`: __Array|String__ - text of your code  
`includeHtml` __Boolen=true__ Include the HTML in beautifying (e.g. if HTML code is not format-able).  
`return`: __{Array|String}__ Formatted code. Array or string based on the initial input.  
`throws`: Syntax Error if HTML cannot be formatted.

## Setup

You can set the extension as following.
``` javascript
const ampscript = {
  capitalizeAndOrNot: true,
  capitalizeIfFor: true,
  capitalizeSet: true,
  capitalizeVar: true,
  maxParametersPerLine: 4
};

const editor = {
  insertSpaces: true,
  tabSize: 4
};

const logs = {
  loggerOn: false // <= disable logging
};

beautifier.setup(ampscript, editor, logs);
```

A new experimental feature allows to use a setup file in your project's folder: `.beautyamp.json`:

```json
{
	"ampscript": {
		"capitalizeAndOrNot": true,
		"capitalizeIfFor": true,
		"capitalizeSet": true,
		"capitalizeVar": true,
		"maxParametersPerLine": 4
	},
	"editor": {
		"insertSpaces": true,
		"tabSize": 2
	}
}
```