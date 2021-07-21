const _ = require('lodash');
const formatters = require('./src/formatters');

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
    // console.log('AMP blocks: ', ampBlocks);

    // split by block regex:
    let htmlBlocks = fullText.split(blockRegEx);
    // console.log('HTML blocks: ', htmlBlocks);

    // merge both arrays into one final using the CodeBlocks:
    for (let i = 0; i < htmlBlocks.length - 1; i++) {
      blocks.push(new CodeBlock(htmlBlocks[i].trim(), false, delimeter, settings, editorSetup));
      blocks.push(new CodeBlock(ampBlocks[i].trim(), true, delimeter, settings, editorSetup));
    }
    blocks.push(new CodeBlock(htmlBlocks[htmlBlocks.length - 1].trim(), false, delimeter, settings, editorSetup));

    return blocks;
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
          // no level change - not a one-line block:
          block.nestLevel = nestLevel;
          if (!block.isOutputAmp) {
            // inBlockNestChange = this.getExtraOutputIndent();
            nestLevel += block.getExtraOutputIndent();
          }
        } else if (modifier === 'open') {
          // open block - next is +1:
          block.nestLevel = nestLevel;
          nestLevel++;
        } else if (modifier === 'reopen') {
          // reopen block - this block -1; next is +1:
          block.nestLevel = nestLevel - 1;
        } else if (modifier === 'close') {
          // close block - this block -1; next is -1:
          nestLevel--;
          block.nestLevel = nestLevel;
        }
      } // don't touch HTML blocks
      // console.log(`Indentation level for: ${i} is: ${lastNestLevel}`);
    });
  },

  returnAsLines(blocks) {
    let lines = [];
    // console.log('in returnAsLines(). blocks:', blocks.length);
    blocks.forEach((block, i) => {
      // console.log(`${i}`, blocks[i]);
      lines = _.concat(lines, block.returnAsLines());
    });
    // console.log('returning returnAsLines()');
    return lines;
  },

  /**
   * Format code.
   * @param {Array} lines text of your code as an Array.
   * @return {Array} Array of lines.
   */
  beautify(lines, setup, editorSetup) {
    if (!setup) {
      setup = {
        capitalizeAndOrNot:true,
        capitalizeIfFor:true,
        capitalizeSet:true,
        capitalizeVar:true,
      };
    }
    if (!editorSetup) {
      editorSetup = {
        insertSpaces: true,
        tabSize: 4
      }
    };

    // Cut blanks lines from start and end:
    console.log("getCodeBlocks");
    lines = this.cutBlanksAtStartEnd(lines);
    // get code blocks:
    console.log("getCodeBlocks"); 
    const blocks = this.getCodeBlocks(lines, undefined, setup, editorSetup);
    // process nesting of the blocks:
    console.log("processNesting");
    this.processNesting(blocks);
    console.log("returnAsLines");
    const newLines = this.returnAsLines(blocks);

    // TODO: change me:
    return newLines.join("\n");
  }
}

class CodeBlock {
  constructor(lines, isAmp, delimeter, setup, editorSetup) {
    this.delimeter = delimeter === undefined ? '\n' : delimeter;

    this.indentator = editorSetup.insertSpaces ? ' '.repeat(editorSetup.tabSize) : '\t';
    console.log(`Indentation Sign: "${this.indentator}". Use Spaces: ${editorSetup.insertSpaces}, width: ${editorSetup.tabSize}`);
    // this.indentator = indentationSign === undefined ? '\t' : indentationSign;
    this.indentMarker = '=>';

    this.lines = lines;
    // following two cannot be true at the same time:
    this.isAmp = isAmp; // any %%[ ]%% block
    this.isOutputAmp = false; // any %%= =%% block

    this.isOneliner = false; // defaults

    this.nestLevel = 0; // defaults
    this.nestModifier = 0; // is this (one-line) block increasing/decreasing the nest level?

    // console.log('setup: ', setup);
    this.capitalizeSet = setup.capitalizeSet;
    this.capitalizeVar = setup.capitalizeVar;
    this.capitalizeAndOrNot = setup.capitalizeAndOrNot;
    this.capitalizeIfFor = setup.capitalizeIfFor;

    this.maxParametersPerLine = typeof setup.maxParametersPerLine === 'number' ? setup.maxParametersPerLine : 20;

    // start processing:
    if (this.isAmp) {
      this.makeOneLiner();
      this.checkForOneliners();

      if (this.isOneliner) {
        // oneliner:
        this.formatOneLiner();
      } else {
        // for multi-line blocks:
        this.createNewLines(); // makes the one-liner into a list again!

        const lines = typeof this.lines === 'string' ? [this.lines] : this.lines;

        lines.forEach((line, i, lines) => {
          let lineTemp = line;
          lineTemp = this.formatAssignment(lineTemp);
          lineTemp = this.formatVarDeclaration(lineTemp, i);
          lineTemp = this.formatElseAndEndifLine(lineTemp, i);
          lineTemp = this.formatForDeclaration(lineTemp, i);
          lineTemp = this.formatForNext(lineTemp, i);

          lineTemp = this.formatMethodLine(lineTemp, i);
          lineTemp = this.runStatements(lineTemp, i);
          lines[i] = lineTemp;
        }, this);

      }
    } else {
      // checks on non-AMP-blocks (HTML/output AMP):
      this.checkForOutputAmpBlock();
    }
  }

  formatForDeclaration(line, i) {
    const forDeclaration = /(FOR)\s+(.*)\s+(DO)/gi;

    let _this = this;
    if (forDeclaration.test(line)) {
      return line.replace(forDeclaration, function (match, p1, p2, p3) {
        return _this.formatFor(p1, p2, p3);
      });
    }
    return line;
  }

  formatFor(forWord, iterator, doWord) {
    if (this.capitalizeIfFor) {
      forWord = forWord.toUpperCase();
      doWord = doWord.toUpperCase();
    } else {
      forWord = forWord.toLowerCase();
      doWord = doWord.toLowerCase();
    }
    // TODO: format the iterator:
    iterator = this.formatIterationDeclaration(iterator);

    return `${forWord} ${iterator} ${doWord}`;
  }

  formatIterationDeclaration(iterator) {
    const declaration = /(.*)[\t\ ]+(to)[\t\ ]+(.*)/gi;

    let _this = this;
    if (declaration.test(iterator)) {
      return iterator.replace(declaration, function (match, p1, p2, p3) {
        const toWord = _this.capitalizeIfFor ? p2.toUpperCase() : p2.toLowerCase();
        return _this.formatFor(p1, toWord, p3);
      });
    }
    return iterator;
  }

  formatForNext(line, i) {
    const forCounterCheck = /((NEXT)[\t\ ]+(\S+)|(NEXT))/gi;
    console.log('... HEY NEXT!!');

    let _this = this;
    if (forCounterCheck.test(line)) {
      console.log(`..."${line}"`);
      try {
        return line.replace(forCounterCheck, function (match, p1, p2, p3) {
          // console.log('====>', match, p1, p2, p3);
          if (p2 && p3) {
            return _this.formatNextIteration(p2, p3);
          } else {
            return p1;
          }
        });
      } catch (err) {
        console.log('!ERROR:: ', err);
      }
    }
    console.log('... STILL HERE!!');
    return line;
  }

  formatNextIteration(nextKeyword, counter) {
    nextKeyword = nextKeyword.trim();
    console.log(`=> NEXT: "${nextKeyword}", counter: "${counter}"`);
    if (this.capitalizeIfFor) {
      nextKeyword = nextKeyword.toUpperCase();
    } else {
      nextKeyword = nextKeyword.toLowerCase();
    }
    // console.log(`=> NEXT: "${nextKeyword}"`);
    if (typeof counter === 'string' && counter !== '') {
      // TODO: finish this:
      // let statement = this.formatStatement(condition);
      return `${nextKeyword} ${counter}`;
    } else {
      // console.log(`=> no counter`);
      return `${nextKeyword}`;
    }
  }

  formatVarDeclaration(line, i) {
    const declarationCheck = /^VAR\s+(.*)/i;

    let varKeyword = 'var';
    if (this.capitalizeVar) {
      varKeyword = 'VAR';
    }

    if (declarationCheck.test(line)) {
      console.log(`VAR: "${line}"`);
      let paramsStr = line.replace(declarationCheck, '$1');
      let vars = paramsStr.split(',');
      let params = [];
      vars.forEach((param) => {
        params.push(param.trim());
      });
      return varKeyword + ' ' + params.join(', ');
    }
    return line;
  }

  // only for multiline blocks 
  formatAssignment(line) {
    // const lines = typeof this.lines === 'string' ? [this.lines] : this.lines;
    const assignmentRegEx = /set[\ \t]+(\@\w+)[\ \t]*=[\ \t]*([\S\ \t]+)/gi;
    // console.log('typeof: ' + typeof this.lines, Array.isArray(this.lines));
    let setKeyword = 'set';
    if (this.capitalizeSet) {
      setKeyword = 'SET';
    }

    if (assignmentRegEx.test(line)) {
      // console.log('Matched assignment!');
      return line.replace(assignmentRegEx, setKeyword + ' $1 = $2');
    }
    return line;
  }

  formatMethodLine(line, i) {
    const methodsDetect = /(^[\t\ ]*|set[\t\ ]+@\w+[\t\ ]*=[\t\ ]*)(\w+\(.*\))/gi;

    if (methodsDetect.test(line)) {
      const _this = this;
      return line.replace(methodsDetect, function (match, p1, p2) {
        let method = _this.formatMethod(p2, 0);
        // console.log(`${i}: ${method}`);
        return `${p1}${method}`;
      });
    }
    return line;
  }

  formatMethod(methodStr, methodIndent) {
    // TODO: replace following regex with one that's not going to cause the issue #3
    // const commaBreaker = /,(?=(?:[^\"\'\(\)]*[\"\'\(\)][^\"\'\(\)]*[\"\'\(\)])*[^\"\'\(\)]*$)/gi;
    const methodsDetect = /(\w+)\((.*)\)/gi;

    let methodSplit = formatters.splitMethodParams(methodStr);
    let parameters = methodSplit[1];
    let methodEnd = methodSplit[2];
    let parametersList = formatters.splitParameters(parameters);

    parametersList.forEach((param, i, parametersList) => {
      let paramCopy = param.trim();
      // console.log(`...`,paramCopy);

      if (methodsDetect.test(paramCopy)) {
        console.log(`Nested method: ${methodIndent}`);
        paramCopy = this.formatMethod(paramCopy, methodIndent + 1);
      }
      parametersList[i] = paramCopy;
    }, this);

    parameters = this.joinMethodParameters(parametersList, methodIndent);
    // to be sure, that method ending does not contain another method:
    if (methodsDetect.test(methodEnd)) {
      console.log(`Nested method in methodEnd! ${methodIndent}`);
      methodEnd = this.formatMethod(methodEnd, 0);
    }
    // return:
    return `${methodSplit[0]}${parameters}${methodEnd}`;
  }

  joinMethodParameters(parametersList, methodIndent) {
    let params;
    // console.log(`joinMethodParameters: ${parametersList.length}, methodIndent: ${methodIndent}.`);
    if (parametersList.length > this.maxParametersPerLine) {
      for (let i = 0; i < parametersList.length; i++) {
        parametersList[i] = `${this.indentMarker.repeat(methodIndent + 1)}${parametersList[i]}`;
      }
      params = parametersList.join(',\n');
      params = `\n${params}\n${this.indentMarker.repeat(methodIndent)}`;
    } else {
      params = parametersList.join(', ');
    }

    return params;
  }

  runStatements(line, i) {
    const statementRegEx = /^\s*(IF|ELSEIF)\s+(.*)\s+(THEN)\s*$/gi;

    if (statementRegEx.test(line)) {
      // console.log(i, ': OK :', line);
      let _this = this;
      return line.replace(statementRegEx, function (match, p1, p2, p3) {
        return _this.formatIf(p1, p2, p3);
      });
    }
    return line;
  }

  formatElseAndEndifLine(line, i) {
    const elseOrEndifCheck = /[\t\ ]*(ENDIF|ELSE)[\t\ ]*/gi;

    let _this = this;
    if (elseOrEndifCheck.test(line)) {
      console.log('ELSE:', line);
      return line.replace(elseOrEndifCheck, function (match, p1) {
        return _this.formatElseAndEndif(p1);
      });
    }
    return line;
  }

  formatIf(ifWord, condition, thenWord) {
    if (this.capitalizeIfFor) {
      ifWord = ifWord.toUpperCase();
      thenWord = thenWord.toUpperCase();
    } else {
      ifWord = ifWord.toLowerCase();
      thenWord = thenWord.toLowerCase();
    }
    let statement = this.formatStatement(condition);

    return `${ifWord} ${statement} ${thenWord}`;
  }

  formatElseAndEndif(keyword) {
    if (this.capitalizeIfFor) {
      return keyword.toUpperCase();
    } else {
      return keyword.toLowerCase();
    }
  }

  formatStatement(statement) {
    // TODO: improve this (the AND/OR could mess up strings!)
    const reg = /[\t\ ]+(AND|OR)[\t\ ]+/gi;
    // split by AND/OR:
    let parts = statement.split(reg);
    parts.forEach((part, i, parts) => {
      let partTemp = part.trim();
      if (partTemp.toLowerCase() === 'and' || partTemp.toLowerCase() === 'or') {
        if (this.capitalizeAndOrNot) {
          partTemp = partTemp.toUpperCase();
        } else {
          partTemp = partTemp.toLowerCase();
        }
      } else {
        partTemp = this.formatCondition(partTemp);
      }

      parts[i] = partTemp;
    }, this);

    return parts.join(' ');
  }

  formatCondition(condition) {
    // start with: ????
    // /[\t\ ]*([=<>!]+)[\t\ ]*/g i
    return condition;
  }

  checkForOneliners() {
    // const onlinerRegEx = /%%\[\s*((IF|ELSEIF)\s+.*?\s+THEN|ELSE|ENDIF)\s*\]%%/gi;
    const blockOpeners = /%%\[\s*((IF)\s+(.*)\s+(THEN)|(FOR)\s+(.*)\s+(DO))\s*\]%%/gi;
    const blockReOpeners = /%%\[\s*(ELSEIF\s+(.*)\s+THEN|ELSE)\s*\]%%/gi;
    const blockClosure = /%%\[\s*(ENDIF|NEXT[\ \t]+\@\w+|NEXT)\s*\]%%/gi;

    if (blockOpeners.test(this.lines)) {
      this.isOneliner = true;
      this.nestModifier = 'open';
    } else if (blockReOpeners.test(this.lines)) {
      this.isOneliner = true;
      this.nestModifier = 'reopen';
    } else if (blockClosure.test(this.lines)) {
      this.isOneliner = true;
      this.nestModifier = 'close';
    }
  }

  formatOneLiner() {
    const ifOrElseifCheck = /(%%\[)\s*(IF|ELSEIF)\s+(.*)\s+(THEN)\s*(\]%%)/gi;
    const elseOrEndifCheck = /(%%\[)\s*(ENDIF|ELSE)\s*(\]%%)/gi;
    const forDeclarationCheck = /(%%\[)[\t\ ]*(FOR)\s+(.*)\s+(DO)[\t\ ]*(\]%%)/gi;
    const forCounterCheck = /(%%\[)[\t\ ]*(NEXT[\t\ ]+(.*)|NEXT)[\t\ ]*(\]%%)/gi;

    let _this = this;
    if (ifOrElseifCheck.test(this.lines)) {
      // this.lines = this.lines.replace(ifOrElseifCheck, '$1 $2 $3 $4 $5');
      this.lines = this.lines.replace(ifOrElseifCheck, function (match, p1, p2, p3, p4, p5) {
        return `${p1} ${_this.formatIf(p2, p3, p4)} ${p5}`;
      });
    } else if (elseOrEndifCheck.test(this.lines)) {
      this.lines = this.lines.replace(elseOrEndifCheck, function (match, p1, p2, p3) {
        return `${p1} ${_this.formatElseAndEndif(p2)} ${p3}`;
      });
    } else if (forDeclarationCheck.test(this.lines)) {
      this.lines = this.lines.replace(forDeclarationCheck, function (match, p1, p2, p3, p4, p5) {
        return `${p1} ${_this.formatFor(p2, p3, p4)} ${p5}`;
      });
    } else if (forCounterCheck.test(this.lines)) {
      this.lines = this.lines.replace(forCounterCheck, function (match, p1, p2, p3, p4) {
        return `${p1} ${_this.formatNextIteration(p2, p3)} ${p4}`;
      });
    }
  }

  checkForOutputAmpBlock() {
    const outputAmpCheck = /^\s*(%%=.*=%%)\s*$/gi;
    // console.log('block:', this.lines);
    if (outputAmpCheck.test(this.lines)) {
      // console.log('output AMP:', this.lines);
      this.isOutputAmp = true;
    }
  }

  findComments(lines) {
    let newLines = []; // structure: keepBreaking: boolean, content: string

    const commentBreaker = /(\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/gi;
    let parts = lines.split(commentBreaker);

    parts.forEach((line) => {
      if (line.trim() !== '') {
        const lineBlock = {
          keepBreaking: true,
          content: line
        };
        if (commentBreaker.test(line)) {
          console.log('//comment =>\n', line, '\n<= comment end');
          lineBlock.keepBreaking = false;
        }
        newLines.push(lineBlock);
      }
    });
    return newLines;
  }

  createNewLines() {
    let newLines = [];
    let parts;
    let lineChanges;

    const breakers = [
      { // block end
        'reg': /\]%%/gui,
        'replace': `]%%`,
        'name': `block-end`
      },
      { // SET
        'reg': /SET\s+@/gui,
        'replace': `set @`,
        'name': `set`
      }, { // VAR
        'reg': /VAR\s+@/gui,
        'replace': `var @`,
        'name': `var`
      },
      { // IF/ELSEIF
        'reg': /(\s+|%%\[)(IF|ELSEIF)\s+(.*?)\s+(THEN)\s+/gi,
        'replace': `$1\n$2 $3 $4\n`,
        'name': `if-elseif`,
        'noNewLine': true
      }, { // ELSE/ENDIF
        'reg': /(\s+|%%\[)(ENDIF|ELSE)\s+/gi,
        'replace': `$1\n$2\n`,
        'name': `else-endif`,
        'noNewLine': true
      },
      { // standalone methods (if preceeded by another method):
        'reg': /\)[\t\ ]*(\w+\(.*?\))/gi,
        'replace': `)\n$1`,
        'noNewLine': true,
        'name': `methods`
      },
      { // standalone methods (if preceeded by ):
        'reg': /(\'|\"|false|true|\d+)[\t\ ]+?(\w+\(.*?\))/gi,
        'replace': `$1\n$2`,
        'noNewLine': true,
        'name': `methods-after-value`
      },
      { // FOR
        'reg': /[\t\ ]+(FOR)[\t\ ]+(.*)[\t\ ]+(DO)[\t\ ]+/gi,
        'replace': `$1 $2 $3\n`,
        'name': `for`
      }, { // NEXT - with whitespace
        'reg': /([\t\ ]+)(NEXT)/gi,
        'replace': `$2`,
        'name': `next-whitespace`
      }, { // NEXT - after block-opener
        'reg': /(%%\[)(NEXT)/gi,
        'replace': `$1\n$2`,
        'name': `next-block`,
        'noNewLine': true
      }
    ];

    let lines = [];
    if (typeof this.lines === 'string') {
      lines = this.findComments(this.lines);
    } else {
      throw new Error(`WARN: block is an array!`);
      // lines = this.lines;
    }
    // const lines = typeof this.lines === 'string' ? [this.lines] : this.lines;

    lines.forEach((line) => {
      if (line.keepBreaking) {
        console.log('LINES BREAK:', line.content);
        // normal piece of code - break it:
        lineChanges = line.content;
        for (let i in breakers) {
          const breakRegEx = breakers[i].reg;
          let replaceWith = (breakers[i].noNewLine ? '' : this.delimeter) + breakers[i].replace;

          // while there are stuff to change - for cases, when matches can be overlaping:
          let counter = 0;

          let lineChanged = breakRegEx.test(lineChanges);
          if (lineChanged) { console.log("--->", breakers[i].name, ' ==> ', lineChanged); }
          while (lineChanged && counter++ < 2) {
            // if (breakers[i].name === 'for') { console.log(`==> `, lineChanges.match(breakRegEx)); } 
            // if (breakers[i].name === 'methods-after-value') { console.log(`==> `, lineChanges.match(breakRegEx)); }
            lineChanges = lineChanges.replace(breakRegEx, replaceWith);
          }
        }
        // split by new line
        parts = lineChanges.split(this.delimeter);
        parts = _.remove(parts, (line) => {
          return line.trim() !== '';
        });
        // push
        newLines = _.concat(newLines, parts);
      } else {
        // comment found:
        newLines = _.concat(newLines, line.content);
      }
    });

    this.lines = newLines;
  }



  /**
   * Get line indentation string (whitespaces).
   * Block indentation is obtained automaticaly from block.
   * @param {number} inBlockLineIndentation extra indentation for current line
   * @return {string} indentation string (whitespaces)
   */
  getIndentation(inBlockLineIndentation) {
    // must be handled separately!
    const inLineIndentation = typeof inBlockLineIndentation === 'number' ? inBlockLineIndentation : 0;
    const nstLvl = this.nestLevel >= 0 ? this.nestLevel : 0; // because no block can start at minus column
    // console.log(`${this.nestLevel}, ${inLineIndentation}`);
    const finalIndent = nstLvl + inLineIndentation >= 0 ? nstLvl + inLineIndentation : 0;
    return this.indentator.repeat(finalIndent);
  }

  makeOneLiner() {
    const commentBreaker = /(\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/gi;
    let parts = this.lines.split(commentBreaker);
    let lines = [];
    // console.log(parts);

    if (typeof this.lines === 'string') {
      parts.forEach((part) => {

        if (commentBreaker.test(part)) {
          console.log('skip: ', part);
        } else {
          let codeParts = part.split(this.delimeter);
          part = codeParts.join(' ');
        }
        lines.push(part);
      })
      this.lines = lines.join(' ');
    } else {
      this.lines = this.lines.join(' ');
    }
    // if (typeof this.lines === 'string') {
    //   let parts = this.lines.split(this.delimeter);
    //   this.lines = parts.join(' ');
    // } else {
    //   this.lines = this.lines.join(' ');
    // }
  }

  // expects separated lines, returns integer with the change of indentation (nesting)
  getExtraOutputIndent() {
    const blockOpeners = /^(IF\s+(.*)\s+THEN|FOR\s+(.*)\s+DO)/i;
    // const blockReOpeners = /(ELSEIF\s+(.*)\s+THEN|ELSE)/i; // not necessary - does not change the level
    const blockClosure = /(ENDIF|NEXT[\ \t]+\@\w+|NEXT)/i;

    let finalNestChange = 0;
    let lines = this.lines;
    lines.forEach((line, i) => {
      if (i > 0 && i < lines.length) {
        let lineCopy = line.trim();
        // to handle inner-blocks:
        if (blockOpeners.test(lineCopy)) {
          // opening block:
          // console.log(`>> ${lineCopy}`);
          finalNestChange += 1;
        } else if (blockClosure.test(lineCopy)) {
          // closing block:
          // console.log(`<< ${lineCopy}`);
          finalNestChange -= 1;
        }
      }
    }, this);
    // console.log(`block nest change: ` + finalNestChange);
    return finalNestChange;
  }

  indentBlockParenthesis(lines, indent) {
    let blockOpenTag = lines[0];
    let blockCloseTag = lines[lines.length - 1];

    lines[0] = this.getIndentation(indent) + blockOpenTag;
    lines[lines.length - 1] = this.getIndentation(indent) + blockCloseTag;
  }

  getMethodIndentation(line) {
    // TODO: XXX
    let newLine = '';
    if (line.startsWith(this.indentMarker)) {
      // how many are there? Only from the beginning!!!
      let i = 0;
      while (line.startsWith(this.indentMarker) && i < 20) {
        newLine += this.indentator; // method indent char
        line = line.substring(this.indentMarker.length, line.length);
        i++;
      }
      newLine += line;
    } else {
      newLine = line;
    }
    return newLine;
  }

  indentAmpBlockLines() {
    const blockOpeners = /((IF)\s+(.*)\s+(THEN)|(FOR)\s+(.*)\s+(DO))/i;
    const blockReOpeners = /(ELSEIF\s+(.*)\s+THEN|ELSE)/i;
    const blockClosure = /(ENDIF|NEXT[\ \t]+\@\w+|NEXT)/i;

    // split by line delimeter:
    let lines = this.lines.split(this.delimeter);
    let initialIndent = 0;
    let inBlockIndent = 1;
    let startsWithElse = null; // not defined; true - take away one tab from block's %%[]%% indents

    lines.forEach((line, i) => {
      // console.log(`${i}`, blocks[i]);
      let lineCopy = line.trim();

      let currentIndent = inBlockIndent;
      // console.log(`${i} "${lineCopy}"`, blockClosure.test(line));
      if (i > 0 && i < lines.length - 1) {
        // to handle inner-blocks:
        if (blockReOpeners.test(lineCopy)) { // re-opening block:
          // lineCopy = '>>}{' + lineCopy;
          currentIndent -= 1;
          if (startsWithElse === null) {
            startsWithElse = true;
          }
        } else if (blockOpeners.test(lineCopy)) { // opening block:
          // lineCopy = '>>{' + lineCopy;
          inBlockIndent += 1;
          if (startsWithElse === null) {
            startsWithElse = false;
          }
        } else if (blockClosure.test(lineCopy)) { // closing block:          
          // lineCopy = '}<<' + lineCopy;
          currentIndent -= 1;
          inBlockIndent -= 1;
          if (startsWithElse === null) {
            startsWithElse = false;
          }
        } else {
          // inside some block or outside any block:
          if (startsWithElse === null && lineCopy !== '') {
            startsWithElse = false;
          }
        }
        // line = `||${lineCopy}||`;
        // lineCopy = this.getIndentation(currentIndent) + lineCopy;
        lineCopy = this.getIndentation(currentIndent) + this.getMethodIndentation(lineCopy);

      }
      // console.log(`${i}: ${inBlockIndent}`);
      lines[i] = lineCopy;
    }, this);

    // if the block starts with else/elseif:
    // console.log(`Starts with Indent: ${startsWithElse}, indent: ${initialIndent}`);
    initialIndent = startsWithElse === true ? initialIndent - 1 : initialIndent;
    // if (startsWithElse === true) { console.log('...', initialIndent, lines[1]); }
    this.indentBlockParenthesis(lines, initialIndent);

    // join:
    this.lines = lines.join(this.delimeter);
  }

  returnAsLines() {
    // console.log(`=> isAmp: ${this.isAmp}, type: ${typeof this.lines}, isArray: ${Array.isArray(this.lines)}`);
    if (Array.isArray(this.lines)) {
      this.lines = this.lines.join(this.delimeter);
    }
    // console.log(`Block - isAmp: ${this.isAmp}, isOneLine: ${this.isOneliner}, isOutputAmp: ${this.isOutputAmp}`);
    if (this.isAmp && !this.isOneliner) { // if AMPscript:
      this.indentAmpBlockLines();
    } else if (this.isOutputAmp || this.isOneliner) { // in case of Output AMPscript %%= =%%:
      // this is for one-liner output AMPscript:
      // console.log(`...oneLineIndent. ${typeof this.lines}, ${this.nestLevel}`);
      this.lines = this.lines.trim();
      this.lines = this.getIndentation() + this.lines;
    }
    // this.lines = `${this.nestModifier}/${this.nestLevel} => ${this.lines}`;

    return this.lines;
  }
}