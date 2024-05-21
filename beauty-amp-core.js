const _ = require('lodash');

const prettier = require("prettier/standalone");
const htmlParser = require("prettier/parser-html");
const babelParser = require("prettier/parser-babel");
const estreeParser = require("prettier/plugins/estree");
// const cssParser = require("prettier/parser-postcss");

const CodeBlock = require('./src/codeBlock');
const VarReplacer = require('./src/varReplacer');

const setup = require('./src/setup');
const Logger = require("./src/logger");

let logger = new Logger();

module.exports = {
  /**
   * Setup the module.
   * @param {Object} ampscript
   * @param {Object} editor
   * @param {Object} logs
   *    {string|Number} logLevel - Log level
   *    {Boolean = true} loggerOn - enable the logger
   */
  setup(ampscript, editor, logs) {
    setup.setup(ampscript, editor, logs);
    logger.setup(logs);
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

    if (includeHtml) {
      lines = await processHtml(lines);
    }

    // Cut blanks lines from start and end:
    logger.log("getCodeBlocks()");
    lines = cutBlanksAtStartEnd(lines);
    // get code blocks:
    logger.log("getCodeBlocks"); 
    const blocks = getCodeBlocks(lines, undefined, setup.ampscript, setup.editor);
    // process nesting of the blocks:
    logger.log("processNesting");
    processNesting(blocks);
    logger.log("returnAsLines");
    const newLines = returnAsLines(blocks);

    // TODO: change me:
    if (isArray) {
      return newLines.join("\n").split("\n");
    } else {
      return newLines.join("\n");
    }
  }
}

function cutBlanksAtStartEnd(lines, delimeter = '\n') {
  return lines.join(delimeter).trim().split(delimeter);
}

function getCodeBlocks(lines, delimeter = '\n', settings, editorSetup) {
  const fullText = lines.join(delimeter);
  const blockRegEx = /%%\[.*?\]%%/gis;

  const ampBlocks = fullText.match(blockRegEx) || [];
  const htmlBlocks = fullText.split(blockRegEx);

  const blocks = htmlBlocks.flatMap((htmlBlock, i) => {
    const blocks = [new CodeBlock(htmlBlock.trim(), false, delimeter, settings, editorSetup, logger)];
    if (ampBlocks[i]) {
      blocks.push(new CodeBlock(ampBlocks[i].trim(), true, delimeter, settings, editorSetup, logger));
    }
    return blocks;
  });

  return blocks;
}

/**
 * Remove AMPscript from HTML, so it does not get messed up by Prettier, then formats the HTML.
 * @param {*} lines
 * @returns {*} lines
 */
async function processHtml(lines) {
  logger.disable();
  const ampBlocks = getCodeBlocks(lines, undefined, setup.ampscript, setup.editor);
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
  // remove stuff that shouldn't be formatted:
  const replacer = new VarReplacer(logger, true);
  code = replacer._replaceStuff(code, /%%=.*?=%%/gmi);
  const regexToUse = new RegExp(`${setup.ampscript.mustacheTags[0]}.*?${setup.ampscript.mustacheTags[1]}`, "gmi");
  code = replacer._replaceStuff(code, regexToUse);
  code = replacer._finalizeHiding(code);

  // format HTML:
  let x = await prettier.format(code, { ...setup.htmlOptions, parser: 'html', plugins: [htmlParser] });
  
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let matches = Array.from(x.matchAll(scriptPattern));
  for (let match of matches) {
    let formattedScript = await prettier.format(match[1], {
      ...setup.htmlOptions,
      parser: 'babel',
      plugins: [babelParser, estreeParser]
    });

    formattedScript = formattedScript.split('\n').map(line => {
      return line == '' ? line : `    ${line}`;
    }).join('\n');
    formattedScript = `\n` + formattedScript;

    x = x.replace(match[0], match[0].replace(match[1], formattedScript));
  }

  logger.log(`prettifyHtml`, typeof(x));
  // replace back the hidden stuff:
  x = replacer.showVars(x);
  // return the formatted code:
  return x;
}

function processNesting(blocks) {
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
}

function returnAsLines(blocks) {
  let lines = [];
  // logger.log('in returnAsLines(). blocks:', blocks.length);
  blocks.forEach((block, i) => {
    // logger.log(`${i}`, blocks[i]);
    lines = _.concat(lines, block.returnAsLines());
  });
  // logger.log('returning returnAsLines()');
  return lines;
}