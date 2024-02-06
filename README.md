# Beauty AMP Core 2

This library gives you the option to format AMPscript code used in SFMC.  
Includes HTML formatting using Prettier.  
Duplicated to continue support of the original library.

## Installation

```
> npm install --save beauty-amp-core2
```

## Usage

This module can format AMPscript code either as an array (of lines) or as a string.
The output type matches the input type.

### beautify(lines)
Format code. Lines are broken on `"\n"`. Is Async.  
`lines`: __Array|String__ - text of your code  
`includeHtml` __Boolen=true__ Include the HTML in beautifying (e.g. if HTML code is not format-able).  
`return`: __{Array|String}__ Formatted code. Array or string based on the initial input.  
`throws`: Syntax Error if HTML cannot be formatted.

#### Array input:
``` javascript
const beautifier = require('beauty-amp-core2');

beautifier.setup(); // setup is explained later

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

#### String input:
``` javascript
const beautifier = require('beauty-amp-core2');

beautifier.setup(); // setup is explained later

let lines = `<h1>My Test Case:</h1>
%%[ VAR @lang
If (@lang == 'EN') then Output("Hello World!")
Else
	Output("Ciao!")
endif
]%%`;

const result = await beautifier.beautify(lines);
console.log(result); // returns code as a string
```

## Setup

You can set the extension either in code or using a file.

### In code:
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

beautifier.setup(ampscript, editor);
```

### Using setup file:
Or use a setup file in your project's folder (project root). Name `.beautyamp.json`:

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

You still need to call the `setup()`:
```javascript
beautifier.setup();
```