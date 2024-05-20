const _ = require('lodash');

const VarReplacer = require('./varReplacer');
const formatters = require('./formatters');

let logger;

module.exports = class CodeBlock {

  constructor(lines, isAmp, delimeter = '\n', setup = {}, { insertSpaces, tabSize } = {}, loggerRef = { log: () => {} }) {
    logger = loggerRef;
    logger.log(`=== CodeBlock() ===`);
  
    this.delimeter = delimeter;
    this.indentator = insertSpaces ? ' '.repeat(tabSize) : '\t';
    logger.log(`Indentation Sign: "${this.indentator}". Use Spaces: ${insertSpaces}, width: ${tabSize}`);
    this.indentMarker = '=>';
  
    this.pureLines = lines;
    this.lines = lines;
    this.isAmp = isAmp;
    this.isOutputAmp = false;
    this.isOneliner = false;
    this.nestLevel = 0;
    this.nestModifier = 0;
  
    const { capitalizeSet, capitalizeVar, capitalizeAndOrNot, capitalizeIfFor, maxParametersPerLine = 20 } = setup;
    this.capitalizeSet = capitalizeSet;
    this.capitalizeVar = capitalizeVar;
    this.capitalizeAndOrNot = capitalizeAndOrNot;
    this.capitalizeIfFor = capitalizeIfFor;
    this.maxParametersPerLine = maxParametersPerLine;
  
    this.replacer = new VarReplacer(logger);
  
    if (this.isAmp) {
      this.lines = this.replacer.hideVars(this.lines);
      this.makeOneLiner();
      this.checkForOneliners();
  
      if (this.isOneliner) {
        this.formatOneLiner();
      } else {
        this.createNewLines();
        const codeLines = typeof this.lines === 'string' ? [this.lines] : this.lines;
  
        this.lines = codeLines.map((line, i) => {
          line = this.formatAssignment(line);
          line = this.formatVarDeclaration(line, i);
          line = this.formatElseAndEndifLine(line, i);
          logger.log(`formatElseAndEndifLine() => `, line);
          line = this.formatForDeclaration(line, i);
          line = this.formatForNext(line, i);
          line = this.formatMethodLine(line, i);
          return this.runStatements(line, i);
        });
      }
    } else {
      this.checkForOutputAmpBlock();
    }
    logger.log(`=== CodeBlock() END ===`);
  }

  /**
   * Format FOR declaration line (main to call).
   * @param {string} line
   * @param {*} i
   * @returns {string}
   */
  formatForDeclaration(line) {
    const forDeclaration = /(FOR)\s+(.*)\s+(DO)/gi;
  
    if (forDeclaration.test(line)) {
      return line.replace(forDeclaration, (match, p1, p2, p3) => this.formatFor(p1, p2, p3));
    }
    return line;
  }
  
  /**
   * Format FOR iteration line.
   * @param {string} forWord
   * @param {string} iterator
   * @param {string} doWord
   * @returns {string}
   */
  formatFor(forWord, iterator, doWord) {
    forWord = this.capitalizeIfFor ? forWord.toUpperCase() : forWord.toLowerCase();
    doWord = this.capitalizeIfFor ? doWord.toUpperCase() : doWord.toLowerCase();
    iterator = this.formatIterationDeclaration(iterator);
  
    return `${forWord} ${iterator} ${doWord}`;
  }
  
  /**
   * Format for iteration declaration line.
   * @param {string} iterator line of code
   * @returns {string}
   */
  formatIterationDeclaration(iterator) {
    const declaration = /(.*)[\t\ ]+(to)[\t\ ]+(.*)/gi;
  
    if (declaration.test(iterator)) {
      return iterator.replace(declaration, (match, p1, p2, p3) => {
        logger.log(`formatIterationDeclaration(): ${match}, ${p1}, ${p2}, ${p3}.`);
        const toWord = this.capitalizeIfFor ? p2.toUpperCase() : p2.toLowerCase();
      
        return `${p1} ${toWord} ${p3}`;
      });
    }
    return iterator;
  }

  /**
   * Format NEXT iteration line.
   * @param {string} line 
   * @param {*} i 
   * @returns {string}
   */
  formatForNext(line) {
    const forCounterCheck = /((NEXT)[\t\ ]+(\S+)|(NEXT))/gi;
    logger.log(`For-Next-start`);
  
    if (forCounterCheck.test(line)) {
      logger.log(`..."${line}"`);
      try {
        return line.replace(forCounterCheck, (match, p1, p2, p3) => p2 && p3 ? this.formatNextIteration(p2, p3) : p1);
      } catch (err) {
        logger.log('!ERROR:: ', err);
      }
    }
    logger.log(`For-Next-end`);
    return line;
  }

  /**
   * Format next iteration line.
   * @param {string} nextKeyword next keyword itself
   * @param {string} counter iterator var from the statement
   * @return {string}
   */
  formatNextIteration(nextKeyword, counter) {
    nextKeyword = nextKeyword.trim();
    logger.log(`=> NEXT: "${nextKeyword}", counter: "${counter}"`);
  
    nextKeyword = this.capitalizeIfFor ? nextKeyword.toUpperCase() : nextKeyword.toLowerCase();
  
    if (typeof counter === 'string' && counter !== '') {
      return `${nextKeyword} ${counter}`;
    } else {
      return `${nextKeyword}`;
    }
  }

  /**
   * Format variable declaration line.
   * @param {string} line 
   * @param {*} i placeholder
   * @returns 
   */
  formatVarDeclaration(line, i) {
    const declarationCheck = /^VAR\s+(.*)/i;
  
    const varKeyword = this.capitalizeVar ? 'VAR' : 'var';
  
    if (declarationCheck.test(line)) {
      logger.log(`VAR: "${line}"`);
      const paramsStr = line.replace(declarationCheck, '$1');
      const vars = paramsStr.split(',');
      const params = vars.map(param => param.trim());
      return `${varKeyword} ${params.join(', ')}`;
    }
    return line;
  }

  // only for multiline blocks 
  formatAssignment(line) {
    // const lines = typeof this.lines === 'string' ? [this.lines] : this.lines;
    const assignmentRegEx = /set[\ \t]+(\@\w+)[\ \t]*=[\ \t]*([\S\ \t]+)/gi;
    // logger.log('typeof: ' + typeof this.lines, Array.isArray(this.lines));
    let setKeyword = 'set';
    if (this.capitalizeSet) {
      setKeyword = 'SET';
    }

    if (assignmentRegEx.test(line)) {
      // logger.log('Matched assignment!');
      return line.replace(assignmentRegEx, setKeyword + ' $1 = $2');
    }
    return line;
  }

  formatMethodLine(line, i) {
		logger.log(`${i}:formatMethodLine("${line}")`);
    const methodsDetect = /(\%\%\[|THEN|ELSE|ENDIF|DO|NEXT|set[\t\ ]+@\w+[\t\ ]*=|)[\t\ ]*(\w+\(.*\))/gi;
    // const methodsDetect = /(\%\%\[[\t\ ]*|[\t\ ]*|set[\t\ ]+@\w+[\t\ ]*=[\t\ ]*)(\w+\(.*\))/gi;
    // const methodsDetect = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((?:[^)(]|\((?:[^)(]|\([^)(]*\))*\))*\)/gi;

    if (methodsDetect.test(line)) {
      const _this = this;
      return line.replace(methodsDetect, function (match, p1, p2) {
        let method = _this.formatMethod(p2, 0);
        // logger.log(`${i}: ${method}`);
        // return `${p1}${method}`;
				return ['\%\%\[', 'THEN', 'ELSE', 'ENDIF', 'DO', 'NEXT'].includes(p1.trim())
            ? `${p1}\n${method}`
            : `${p1} ${method}`; 
      });
    }
		logger.log(`${i}:formatMethodLine(): ${line}`);
    return line;
  }

  formatMethod(methodStr, methodIndent) {
		logger.log(`formatMethod("${methodStr}", ${methodIndent})`);
    // TODO: replace following regex with one that's not going to cause the issue #3
    // const commaBreaker = /,(?=(?:[^\"\'\(\)]*[\"\'\(\)][^\"\'\(\)]*[\"\'\(\)])*[^\"\'\(\)]*$)/gi;
    const methodsDetect = /(\w+)\((.*)\)/gi;

    let methodSplit = formatters.splitMethodParams(methodStr);
    let parameters = methodSplit[1];
    let methodEnd = methodSplit[2];
    let parametersList = formatters.splitParameters(parameters);

    parametersList.forEach((param, i, parametersList) => {
      let paramCopy = param.trim();
      // logger.log(`...`,paramCopy);

      if (methodsDetect.test(paramCopy)) {
        logger.log(`Nested method: ${methodIndent}`);
        paramCopy = this.formatMethod(paramCopy, methodIndent + 1);
      }
      parametersList[i] = paramCopy;
    }, this);

    parameters = this.joinMethodParameters(parametersList, methodIndent);
    // to be sure, that method ending does not contain another method:
    if (methodsDetect.test(methodEnd)) {
      logger.log(`Nested method in methodEnd! ${methodIndent}`);
      methodEnd = this.formatMethod(methodEnd, 0);
    }
    // return:
    let lineRes = `${methodSplit[0]}${parameters}${methodEnd}`;
    logger.log(`formatMethod() => "${lineRes}"`);
    return lineRes;
  }

  joinMethodParameters(parametersList, methodIndent) {
    let params;
    logger.log(`joinMethodParameters: ${parametersList.length}, methodIndent: ${methodIndent}.`);
    if (parametersList.length > this.maxParametersPerLine) {
      for (let i = 0; i < parametersList.length; i++) {
        parametersList[i] = `${this.indentMarker.repeat(methodIndent + 1)}${parametersList[i]}`;
      }
      params = parametersList.join(',\n');
      params = `\n${params}\n${this.indentMarker.repeat(methodIndent)}`;
    } else {
      params = parametersList.join(', ');
    }
    logger.log(`joinMethodParameters() => "${params}"`);
    return params;
  }

  runStatements(line, i) {
    const statementRegEx = /^\s*(IF|ELSEIF)\s+(.*)\s+(THEN)\s*$/gi;

    if (statementRegEx.test(line)) {
      // logger.log(i, ': OK :', line);
      let _this = this;
      return line.replace(statementRegEx, function (match, p1, p2, p3) {
        return _this.formatIf(p1, p2, p3);
      });
    }
    return line;
  }

  formatElseAndEndifLine(line, i) {
    const elseOrEndifFunctionCheck = /[\t\ ]*(ENDIF|ELSE)[\t\ ]*(\S+\()/gi;
    const elseOrEndifCheck = /[\t\ ]*(ENDIF|ELSE)[\t\ ]*/gi; // original

    let _this = this;
		if (elseOrEndifFunctionCheck.test(line)) {
			logger.log(`formatElseAndEndifLine("${line}"):`);
      let lineRes = line.replace(elseOrEndifFunctionCheck, function (match, p1, p2) {
        // return _this.formatElseAndEndif(p1);
				if (p2) logger.log(`formatElseAndEndifLine() - P1/P2: ${p1}-${p2}`);
        return p2 ? `${_this.formatElseAndEndif(p1)}\n${p2}` : _this.formatElseAndEndif(p1);
      });
      logger.log(`formatElseAndEndifLine() => "${lineRes}"`);
			return lineRes;
		} else if (elseOrEndifCheck.test(line)) {
      logger.log(`formatElseAndEndifLine("${line}"):`);
      let lineRes = line.replace(elseOrEndifCheck, function (match, p1) {
        return _this.formatElseAndEndif(p1);
      });
      logger.log(`formatElseAndEndifLine() => "${lineRes}"`);
			return lineRes;
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

  /**
   * Checks for the `%%=...=%%` pattern.
   */
  checkForOutputAmpBlock() {
    const outputAmpCheck = /^\s*(%%=.*=%%)\s*$/gi;
    // logger.log('block:', this.lines);
    if (outputAmpCheck.test(this.lines)) {
      // logger.log('output AMP:', this.lines);
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
          logger.log('//comment =>\n', line, '\n<= comment end');
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
        logger.log('LINES BREAK:', line.content);
        // normal piece of code - break it:
        lineChanges = line.content;
        for (let i = 0; i < breakers.length; i++) {
          const breakRegEx = breakers[i].reg;
          let replaceWith = (breakers[i].noNewLine ? '' : this.delimeter) + breakers[i].replace;

          // while there are stuff to change - for cases, when matches can be overlaping:
          let counter = 0;
          let lineChanged;
          try {
            lineChanged = breakRegEx.test(lineChanges);
          } catch (err) {
            console.log(`Error:`, err);
            console.log(`Breaker ${i}/${breakers.length}:`, breakers[i]);
          }
          
          if (lineChanged) { logger.log("--->", breakers[i].name, ' ==> ', lineChanged); }
          while (lineChanged && counter++ < 2) {
            // if (breakers[i].name === 'for') { logger.log(`==> `, lineChanges.match(breakRegEx)); } 
            // if (breakers[i].name === 'methods-after-value') { logger.log(`==> `, lineChanges.match(breakRegEx)); }
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
  getIndentation(inBlockLineIndentation = 0) {
    const nstLvl = Math.max(this.nestLevel, 0); // no block can start at minus column
    const finalIndent = Math.max(nstLvl + inBlockLineIndentation, 0);
    return this.indentator.repeat(finalIndent);
  }

  /**
   * Make one-liner from multi-line block.
   * Works with this.lines.
   */
  makeOneLiner() {
    const commentBreaker = /(\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/gi;
  
    if (typeof this.lines === 'string') {
      const parts = this.lines.split(commentBreaker);
      const lines = parts.map((part) => {
        if (commentBreaker.test(part)) {
          logger.log('skip: ', part);
          return part;
        } else {
          return part.split(this.delimeter).join(' ');
        }
      });
      this.lines = lines.join(' ');
    } else {
      this.lines = this.lines.join(' ');
    }
  }

  // expects separated lines, returns integer with the change of indentation (nesting)
  getExtraOutputIndent() {
    const blockOpeners = /^(IF\s+(.*)\s+THEN|FOR\s+(.*)\s+DO)/i;
    const blockClosure = /(ENDIF|NEXT[\ \t]+\@\w+|NEXT)/i;

    let finalNestChange = 0;
    let lines = this.lines;
    lines.forEach((line, i) => {
      if (i > 0 && i < lines.length) {
        let lineCopy = line.trim();
        // to handle inner-blocks:
        if (blockOpeners.test(lineCopy)) {
          // opening block:
          finalNestChange += 1;
        } else if (blockClosure.test(lineCopy)) {
          // closing block:
          finalNestChange -= 1;
        }
      }
    }, this);
    return finalNestChange;
  }

  indentBlockParenthesis(lines, indent) {
    let blockOpenTag = lines[0];
    let blockCloseTag = lines[lines.length - 1];

    lines[0] = this.getIndentation(indent) + blockOpenTag;
    lines[lines.length - 1] = this.getIndentation(indent) + blockCloseTag;
  }

  getMethodIndentation(line) {
    logger.log(`getMethodIndentation(${line})`);
    let newLine = '';
    const indentMarkerLength = this.indentMarker.length;
  
    while (line.startsWith(this.indentMarker)) {
      newLine += this.indentator;
      line = line.substring(indentMarkerLength);
    }
  
    logger.log(`getMethodIndentation() => ${newLine + line}`);
    return newLine + line;
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
    let inMultilineComment = false;

    lines.forEach((line, i) => {
      logger.log(`START:${i}`, line);
      let lineCopy = line.trim();

      let currentIndent = inBlockIndent;
      // logger.log(`${i} "${lineCopy}"`, blockClosure.test(line));
      if (i > 0 && i < lines.length - 1) {
        // to handle inner-blocks:
        if (blockReOpeners.test(lineCopy)) { // re-opening block:
          logger.log(`RE-OPEN BLOCK: ${i}: ${line}`); 
          // lineCopy = '>>}{' + lineCopy;
          currentIndent -= 1;
          if (startsWithElse === null) {
            startsWithElse = true;
          }
        } else if (blockOpeners.test(lineCopy)) { // opening block:
          logger.log(`OPENING BLOCK: ${i}: ${line}`); 
          // lineCopy = '>>{' + lineCopy;
          inBlockIndent += 1;
          if (startsWithElse === null) {
            startsWithElse = false;
          }
        } else if (blockClosure.test(lineCopy)) { // closing block:
          logger.log(`CLOSING BLOCK: ${i}: ${line}`);          
          // lineCopy = '}<<' + lineCopy;
          currentIndent -= 1;
          inBlockIndent -= 1;
          if (startsWithElse === null) {
            startsWithElse = false;
          }
        } else {
          // inside some block or outside any block:
          logger.log(`INDENT BLOCK: ${i}: ${line}`);
          if (startsWithElse === null && lineCopy !== '') {
            startsWithElse = false;
          }
          lineCopy = inMultilineComment ? ' ' + lineCopy : lineCopy;
          if (line.includes('/*') && !line.includes('*/')) {
            inMultilineComment = true;
          } else if (line.includes('*/')) {
            inMultilineComment = false;
          }
        }
        // line = `||${lineCopy}||`;
        // lineCopy = this.getIndentation(currentIndent) + lineCopy;
        lineCopy = this.getIndentation(currentIndent) + this.getMethodIndentation(lineCopy);

      }
      logger.log(`END:${i}: ${inBlockIndent} - "${lineCopy}"`);
      lines[i] = lineCopy;
    }, this);

    // if the block starts with else/elseif:
    // logger.log(`Starts with Indent: ${startsWithElse}, indent: ${initialIndent}`);
    initialIndent = startsWithElse === true ? initialIndent - 1 : initialIndent;
    // if (startsWithElse === true) { logger.log('...', initialIndent, lines[1]); }
    this.indentBlockParenthesis(lines, initialIndent);

    // join:
    this.lines = lines.join(this.delimeter);
  }

  /**
   * Return lines from CodeBlock.
   * @returns {string}
   */
  returnAsLines() {
    if (Array.isArray(this.lines)) {
      this.lines = this.lines.join(this.delimeter);
    }
  
    if (this.isAmp) {
      if (!this.isOneliner) {
        this.indentAmpBlockLines();
      } else {
        this.lines = this.getIndentation() + this.lines.trim();
      }
      this.lines = this.replacer.showVars(this.lines);
    } else if (this.isOutputAmp || this.isOneliner) {
      this.lines = this.getIndentation() + this.lines.trim();
    }
  
    return this.lines;
  }
}