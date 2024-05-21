const _ = require('lodash');

module.exports = {
  /**
   * Format SET assignments.
   */
  formatAssignment(line, capitalizeSet = true) {
    const assignmentRegEx = /set[\ \t]+(\@\w+)[\ \t]*=[\ \t]*([\S\ \t]+)/gi;
    let setKeyword = capitalizeSet ? 'SET' : 'set';

    if (assignmentRegEx.test(line)) {
      return line.replace(assignmentRegEx, setKeyword + ' $1 = $2');
    }
    return line;
  },

  /**
   * Format variable declaration line.
   * @param {string} line 
   * @param {*} i placeholder
   * @returns 
   */
  formatVarDeclaration(line, capitalizeVar = true) {
    const declarationCheck = /^VAR\s+(.*)/i;
  
    const varKeyword = capitalizeVar ? 'VAR' : 'var';
  
    if (declarationCheck.test(line)) {
      const paramsStr = line.replace(declarationCheck, '$1');
      const vars = paramsStr.split(',');
      const params = vars.map(param => param.trim());
      return `${varKeyword} ${params.join(', ')}`;
    }
    return line;
  },

  /**
   * Splits function parameters. All nested functions and strings including quotes are kept untouched.
   * @param {String} text function parameters without the opening/closing parenthesis
   */
  splitParameters: function (text) {
    let delimeter = ',';
    let splitted = [];
    let opener = ''; // char which has opened the "non-mathing group"
    let closer = '';
    let openers = { "'": `'`, '"': `"`, '(': ')' };
    let nestableOpeners = ['('];
    let counted = 0;
    let word = '';

    const chars = text.split('');

    chars.forEach((ch, i) => {
      let p_ch = i > 0 ? chars[i - 1] : '';

      if (ch === delimeter && opener === '') {
        splitted.push(word);
        word = '';
      } else {
        word += ch;

        if (ch in openers && opener === '' && p_ch !== '\\') {
          opener = ch;
          closer = openers[ch];
          counted++;
        } else if (ch === opener && nestableOpeners.includes(opener) && p_ch !== '\\') {
          counted++;
        } else if (ch === closer && p_ch !== '\\') {
          counted--;
          if (counted === 0) {
            opener = '';
            closer = '';
          }
        }
      }
    });

    if (word !== '') {
      splitted.push(word);
    }

    return splitted;
  },

  /**
   * Separate parameters of a method from method name etc.
   * Used for method formatting.
   * @param {string} methodStr string containing method (can contain the surrounding text - in case of IFF function, where is it e.g. statement)
   * @return {array} Array consisting of three items: ['...methodName(', 'parametersString', ')...']
   */
  splitMethodParams: function (methodStr) {
    methodStr = methodStr.trim();
    const parenthesisStart = methodStr.indexOf("(") + 1;
    let parenthesisEnd = methodStr.length;

    let opened = 1; // opened parenthesis
    let stringOpener = ''; // character which opened string
    const chars = methodStr.split('');
    for (let i = parenthesisStart; i < chars.length; i++) {
      let ch = chars[i];
      let p_ch = i > 0 ? chars[i - 1] : '';
      if ((ch === "'" || ch === '"') && p_ch !== '\\') {
        stringOpener = ch === stringOpener ? '' : ch;
      } else if (ch === '(') {
        opened++;
      } else if (ch === ')' && --opened === 0) {
        parenthesisEnd = i;
        break;
      }
    }

    let methodEnd = methodStr.substring(parenthesisEnd);
    let parameters = methodStr.substring(parenthesisStart, parenthesisEnd);
    let methodStart = methodStr.substring(0, parenthesisStart);

    return [methodStart, parameters, methodEnd];
  }
}