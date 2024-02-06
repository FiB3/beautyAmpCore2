const _ = require('lodash');

let logger;

/**
 * Handles hiding any AMPscript variables from the code - to avoid any conflicts with keywords.
 */
module.exports = class VarReplacer {
	constructor(loggerInstance = { log: () => {} }) {
		logger = loggerInstance;

		this.varGenerator = this.getNextVarName();
		// object with simplified names as values and the original variable names as values.
		this.replacedVarsView = {};
	}

	/**
	 * Replaces all variables in the script text with simplified var names.
	 * @param {String} scriptText text of your code.
	 * @return {String} text with hidden variables.
	 */
	hideVars(scriptText) {
		this.findVars(scriptText);
		this.findAttributeStrings(scriptText);
		this.findSystemStrings(scriptText);


		this.replacedVarsView = {};
		return scriptText;
	}

	/**
	 * Replace all variables in the script text back.
	 */
	showVars(scriptText) {
		return scriptText;
	}

	/**
	 * Find all (AMPscript) variables in the script text.
	 * Adds to the replacedVarsView object.
	 * @param {String} scriptText text of your code.
	 * @return {Object} 
	 */
	replaceVars(scriptText) {
    const regexToUse = /@[a-z0-9]+/gmi;
    return this._replaceStuff(scriptText, regexToUse);
	}

	/**
	 * Find all (AMPscript) Attribute Strings in the script text (https://ampscript.guide/attribute-strings/).
	 * Inline strings (%%string%% is not required).
	 * Adds to the replacedVarsView object.
	 * @param {String} scriptText text of your code.
	 * @return {Object} object with simplified names as values and the original names as values.
	 */
	replaceAttributeStrings(scriptText) {
		const regexToUse = /\[[a-z0-9\ \-]+?\]/gmi;
		return this._replaceStuff(scriptText, regexToUse);
	}

	/**
	 * Find all (AMPscript) System Strings in the script text (https://ampscript.guide/system-strings/).
	 * Adds to the replacedVarsView object.
	 * Currently only those that start with an underscore are supported - identified those like: `_UTCOffset`, `_ModifiedBy`, `_ModifiedDate`
	 * @param {String} scriptText text of your code.
	 * @return {Object} object with simplified names as values and the original names as values.
	 */
	replaceSystemStrings(scriptText) {
		const regexToUse = /_[a-z]+/gmi;
		return this._replaceStuff(scriptText, regexToUse);
	}

	/**
	 * Find all problematic pieces of code in the script text and generate replacements.
	 * @param {*} scriptText text of your code. 
	 * @param {*} regexToUse
	 * @return {string} script text with hidden variables.
	 */
	_replaceStuff(scriptText, regexToUse) {
		let match;
		let matches = new Map();
		let generator = this.getNextVarName();

		while ((match = regexToUse.exec(scriptText)) !== null) {
				let varName = match[0];
				let varNameLower = varName.toLowerCase();
				if (!matches.has(varNameLower)) {
						let simplifiedName = generator.next().value;
						matches.set(varNameLower, {original: varName, simplified: simplifiedName});
				}
		}

		// Convert the Map to an array of objects, then sort them by their first appearance in the script text
		let sortedMatches = Array.from(matches.values()).sort((a, b) => scriptText.indexOf(a.original) - scriptText.indexOf(b.original));

		// Convert the sorted array back to an object with simplified names as keys and original names as values
		for (let match of sortedMatches) {
				this.replacedVarsView[match.simplified] = match.original;
		}
		logger.log(`replacedVarsView:`, this.replacedVarsView);

		// Replace the original variable names in the script text with the simplified names
		let modifiedScriptText = scriptText;
		for (let match of sortedMatches) {
				let regex = new RegExp(_.escapeRegExp(match.original), 'gi');
				logger.log(`regex for: ${match}:`, regex);
				modifiedScriptText = modifiedScriptText.replace(regex, match.simplified);
		}

		return modifiedScriptText;
	}

	*getNextVarName() {
		let vars = 'abcdefghijklmnopqrstuvwxyz'.split('');
		let index = 0;
		let number = 0;

		while (true) {
			if (index >= vars.length) {
				index = 0;
				number++;
			}
			yield `${vars[index++]}${number}`;
		}
	}
};