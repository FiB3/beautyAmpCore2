const _ = require('lodash');

module.exports = {

  /**
   * Splits function parameters. All nested functions and strings including quotes are kept untouched.
   * @param {String} text function parameters without the opening/closing parenthesis
   */
  splitParameters: function (text) {
    console.log(text);
    let delimeter = ',';
    let splitted = [];

    let opener = ''; // char which has opened the "non-mathing group"
    let closer = '';
    let openers = {
      "'": `'`,
      '"': `"`,
      '(': ')'
    };
    let nestableOpeners = ['('];
    let counted = 0;
    let word = '';

    const chars = text.split('');

    chars.forEach((ch, i) => {
      let p_ch = i > 0 ? chars[i - 1] : '';

      if (ch === delimeter && opener === '') {
        // SPLIT-time!
        splitted.push(word);
        word = '';
      } else {
        // console.log(`${i}: ${ch}, o:${opener}, c:${closer}, counted:${counted}`);
        word += ch;

        if (ch in openers && opener === '' && p_ch !== '\\') {
          // open NON-SPLITtable context:
          opener = ch;
          closer = openers[ch];
          counted++;
        } else if (ch === opener && nestableOpeners.includes(opener) && p_ch !== '\\') {
          // console.log('===> 2');
          counted++;
        } else if (ch === closer && p_ch !== '\\') {
          // non-splittable context:
          counted--;
          if (counted === 0) {
            // close hte non-splittable context
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
   * Separate parameters of a method from metho name etc.
   * Used for method formatting.
   * @param {string} methodStr string containing method (can contain the surrounding text - in case of IFF function, where is it e.g. statement)
   * @return {array} Array consisting of three items: ['...methodName(', 'parametersString', ')...']
   */
  splitMethodParams: function (methodString) {
    methodStr = methodString.trim();
    const parenthesisStart = methodStr.indexOf("(") + 1;
    let parenthesisEnd = methodStr.length;

    let opened = 1; // opened parenthesis
    let stringOpener = ''; // character which opened string
    const chars = methodStr.split('');
    for (let i = parenthesisStart; i < chars.length; i++) {
      let ch = chars[i];
      let p_ch = i > 0 ? chars[i - 1] : '';
      if ((ch === "'" || ch === '"') && p_ch !== '\\') {
        if (ch === stringOpener) {
          stringOpener = ''; // exiting string
        } else {
          stringOpener = ch; // entering string
        }
      } else if (ch === '(') {
        opened++;
      } else if (ch === ')') {
        opened--;
        if (opened === 0) {
          parenthesisEnd = i;
          break;
        }
      } // else not needed
    }

    let methodEnd = methodStr.substring(parenthesisEnd);
    let parameters = methodStr.substring(parenthesisStart, parenthesisEnd);
    let methodStart = methodStr.substring(0, parenthesisStart);

    console.log(`${parenthesisStart}:${parenthesisEnd}: ${[methodStart, parameters, methodEnd].join('_|_')}`);
    return [methodStart, parameters, methodEnd];
  }
}