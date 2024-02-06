const path = require('path');
const fs = require('fs');

const prettier = require('prettier');
const _ = require('lodash');
const CodeBlock = require('./src/codeBlock');

const Logger = require("./src/logger");

// set defaults:
let setup = {
  ampscript: {
    capitalizeAndOrNot: true,
    capitalizeIfFor: true,
    capitalizeSet: true,
    capitalizeVar: true,
    maxParametersPerLine: 4
  },
  editor: {
    insertSpaces: true,
    tabSize: 4
  },
  htmlOptions: {
    parser: 'html',
    useTabs: false,
    tabWidth: 4,
    // other settings:
    semi: true,
    trailingComma: 'none',
    singleQuote: false
  }
};

let logger = new Logger();

module.exports = {

  cutBlanksAtStartEnd(lines, lineDelimeter) {
    const delimeter = lineDelimeter !== undefined ? lineDelimeter : '\n';
    let text = lines.join(delimeter);

    text = text.trim();

    const newLines = text.split(delimeter);
    return newLines;
  },

  getCodeBlocks(lines, lineDelimeter, settings, editorSetup) {
    const delimeter = lineDelimeter !== undefined ? lineDelimeter : '\n';
    const fullText = lines.join(delimeter);
    let blocks = [];

    const blockRegEx = /%%\[.*?\]%%/gis;

    // get matches as code blocks:
    let ampBlocks = fullText.match(blockRegEx);
    // logger.log('AMP blocks: ', ampBlocks);

    // split by block regex:
    let htmlBlocks = fullText.split(blockRegEx);
    // logger.log('HTML blocks: ', htmlBlocks);

    // merge both arrays into one final using the CodeBlocks:
    for (let i = 0; i < htmlBlocks.length - 1; i++) {
      blocks.push(new CodeBlock(htmlBlocks[i].trim(), false, delimeter, settings, editorSetup, logger));
      blocks.push(new CodeBlock(ampBlocks[i].trim(), true, delimeter, settings, editorSetup, logger));
    }
    blocks.push(new CodeBlock(htmlBlocks[htmlBlocks.length - 1].trim(), false, delimeter, settings, editorSetup, logger));

    return blocks;
  },

  /**
   * Remove AMPscript from HTML, so it does not get messed up by Prettier.
   * @param {*} lines
   * @returns {*} lines
   */
  async processHtml(lines) {
    logger.disable();
    const ampBlocks = this.getCodeBlocks(lines, undefined, setup.ampscript, setup.editor);
    logger.enable();

    let lns = ampBlocks.map((block, i) => {
      return block.isAmp ?
          `{{block-${i}}}`
          : block.pureLines;
    });

    lns = await prettifyHtml(lns);

    ampBlocks.forEach((block, i) => {
      if (block.isAmp) {
        // string replace & join if Array
        const l = Array.isArray(block.pureLines) ? block.pureLines.join('\n') : block.pureLines;
        lns = lns.replace(`{{block-${i}}}`, l);
      }
    });
    
    logger.log(`# Prettier Result:`);
    logger.log(lns);
    return lns.split('\n');
  },

  processNesting(blocks) {
    // let lastModifier = 0;
    let modifier = '';
    let nestLevel = 0;
    // let inBlockNestChange = 0;

    blocks.forEach((block, i) => {
      if (block.isAmp || block.isOutputAmp) {
        modifier = block.nestModifier;

        if (!block.isOneliner || block.isOutputAmp) {
          logger.log(`processNesting(): isOneliner || isOutputAmp: `, block.lines);
          // no level change - not a one-line block:
          block.nestLevel = nestLevel;
          if (!block.isOutputAmp) {
            // inBlockNestChange = this.getExtraOutputIndent();
            nestLevel += block.getExtraOutputIndent();
          }
        } else if (modifier === 'open') {
          logger.log(`processNesting().open: `, block.lines);
          // open block - next is +1:
          block.nestLevel = nestLevel;
          nestLevel++;
        } else if (modifier === 'reopen') {
          logger.log(`processNesting().reopen: `, block.lines);
          // reopen block - this block -1; next is +1:
          block.nestLevel = nestLevel - 1;
        } else if (modifier === 'close') {
          logger.log(`processNesting().close: `, block.lines);
          // close block - this block -1; next is -1:
          nestLevel--;
          block.nestLevel = nestLevel;
        }
      } // don't touch HTML blocks
      // logger.log(`Indentation level for: ${i} is: ${lastNestLevel}`);
    });
  },

  returnAsLines(blocks) {
    let lines = [];
    // logger.log('in returnAsLines(). blocks:', blocks.length);
    blocks.forEach((block, i) => {
      // logger.log(`${i}`, blocks[i]);
      lines = _.concat(lines, block.returnAsLines());
    });
    // logger.log('returning returnAsLines()');
    return lines;
  },

  /**
   * Format code.
   * Lines are broken on "\n".
   * @param {Array|String} lines text of your code.
   * @param {Boolean} [includeHtml=true] Include the HTML in beautifying (e.g. if HTML code is not format-able).
   * @return {Array|String} Formatted code. Array or string based on the initial input.
   * @throws {SyntaxError} when error on HTML (Prettier) formatting.
   */
  async beautify(lines, includeHtml = true) {
    let isArray = Array.isArray(lines);
    if (typeof(lines) === 'string') {
      lines = lines.split('\n');
    } else if (!isArray) {
      throw "Unsupported 'lines' data type.";
    }

    // run Prettier on HTML:
    if (includeHtml) {
      lines = await this.processHtml(lines);
    }

    // Cut blanks lines from start and end:
    logger.log("getCodeBlocks()");
    lines = this.cutBlanksAtStartEnd(lines);
    // get code blocks:
    logger.log("getCodeBlocks"); 
    const blocks = this.getCodeBlocks(lines, undefined, setup.ampscript, setup.editor);
    // process nesting of the blocks:
    logger.log("processNesting");
    this.processNesting(blocks);
    logger.log("returnAsLines");
    const newLines = this.returnAsLines(blocks);

    // TODO: change me:
    if (isArray) {
      return newLines.join("\n").split("\n");
    } else {
      return newLines.join("\n");
    }
  },

  /**
   * Setup the logger.
   * @param {Object} ampscript - currently unsupported
   * @param {Object} editor - currently unsupported
   * @param {Object} logs
   *    {string|Number} logLevel - Log level
   *    {Boolean = true} loggerOn - enable the logger
   */
  setup(
    ampscript = { capitalizeAndOrNot: true, capitalizeIfFor: true, capitalizeSet: true, capitalizeVar: true, maxParametersPerLine: true },
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
      setup.ampscript.capitalizeAndOrNot = amp.capitalizeAndOrNot === false ? false : true;
      setup.ampscript.capitalizeIfFor = amp.capitalizeIfFor === false ? false : true;
      setup.ampscript.capitalizeSet = amp.capitalizeSet === false ? false : true;
      setup.ampscript.capitalizeVar = amp.capitalizeVar === false ? false : true;
      setup.ampscript.maxParametersPerLine = _.isInteger(amp.maxParametersPerLine) ? amp.maxParametersPerLine : 4;
    }

    if (edit) {
      setup.editor.insertSpaces = edit.insertSpaces === false ? false : true;
      setup.editor.tabSize = _.isInteger(edit.tabSize) ? edit.tabSize : 4;

      setup.htmlOptions.useTabs = !setup.editor.insertSpaces;
      setup.htmlOptions.tabWidth = setup.editor.tabSize;
    }

    logger.setup(logs);
  }
}

/**
 * Prettify HTML code.
 * @param {string|Array} code code as string or array
 * @returns {string} Prettified code.
 */
async function prettifyHtml(code) {
  if (Array.isArray(code)) {
    code = code.join('\n');
  } else if (typeof(code) !== 'string') {
    throw "Unsupported 'code' data type for prettier.";
  }
  let x = await prettier.format(code, setup.htmlOptions);
  logger.log(`prettifyHtml`, typeof(x));
  return x;
}

function lookForSetupFile() {
  try {
    const setupPath = path.resolve(process.cwd(), './.beautyamp.json');

    let rawdata = fs.readFileSync(setupPath);
    return JSON.parse(rawdata);
  } catch(err) {
    return false;
  }
}