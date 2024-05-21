const { isInteger } = require('lodash');

const path = require('path');
const fs = require('fs');

// set defaults:
let setupData = {
  ampscript: {
    capitalizeAndOrNot: true,
    capitalizeIfFor: true,
    capitalizeSet: true,
    capitalizeVar: true,
    maxParametersPerLine: 4,
    mustacheTags: ['{{', `}}`]
  },
  editor: {
    insertSpaces: true,
    tabSize: 4
  },
  htmlOptions: {
    useTabs: false,
    tabWidth: 4,
    // other settings:
    semi: true,
    trailingComma: 'none',
    singleQuote: false
  }
};

function lookForSetupFile() {
  const setupPath = path.resolve(process.cwd(), './.beautyamp.json');
  if (fs.existsSync(setupPath)) {
    const rawdata = fs.readFileSync(setupPath);
    return JSON.parse(rawdata);
  }
  return false;
}

/**
 * Setup the module.
 * @param {Object} ampscript - currently unsupported
 * @param {Object} editor - currently unsupported
 * @param {Object} logs
 *    {string|Number} logLevel - Log level
 *    {Boolean = true} loggerOn - enable the logger
 */
function setup(
  ampscript = { capitalizeAndOrNot: true, capitalizeIfFor: true, capitalizeSet: true, capitalizeVar: true, maxParametersPerLine: true, mustacheTags: ['{{', `}}`] },
  editor = { insertSpaces: true, tabSize: 4 },
  logs
) {
  let setupJson = lookForSetupFile();
  let amp = ampscript;
  let edit = editor;
  if (setupJson) {
    if (setupJson.ampscript) {
      amp = {...amp, ...setupJson.ampscript};
    }
    if (setupJson.editor) {
      edit = {...edit, ...setupJson.editor};
    }
  }

  if (amp) {
    setupData.ampscript.capitalizeAndOrNot = amp.capitalizeAndOrNot === false ? false : true;
    setupData.ampscript.capitalizeIfFor = amp.capitalizeIfFor === false ? false : true;
    setupData.ampscript.capitalizeSet = amp.capitalizeSet === false ? false : true;
    setupData.ampscript.capitalizeVar = amp.capitalizeVar === false ? false : true;
    setupData.ampscript.maxParametersPerLine = isInteger(amp.maxParametersPerLine) ? amp.maxParametersPerLine : 4;
    setupData.ampscript.mustacheTags = Array.isArray(amp.mustacheTags) ? amp.mustacheTags : ['{{', `}}`];
  }

  if (edit) {
    setupData.editor.insertSpaces = edit.insertSpaces === false ? false : true;
    setupData.editor.tabSize = isInteger(edit.tabSize) ? edit.tabSize : 4;

    setupData.htmlOptions.useTabs = !setupData.editor.insertSpaces;
    setupData.htmlOptions.tabWidth = setupData.editor.tabSize;
  }
}

module.exports = {
  ampscript: setupData.ampscript,
  editor: setupData.editor,
  htmlOptions: setupData.htmlOptions,
  lookForSetupFile,
  setup
};