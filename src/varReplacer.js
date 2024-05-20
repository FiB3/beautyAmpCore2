const _ = require('lodash');

/**
 * Handles hiding any AMPscript variables from the code - to avoid any conflicts with keywords.
 */
module.exports = class VarReplacer {
	constructor(loggerInstance = { log: () => {} }) {
		this.logger = loggerInstance;

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
		let script = this.replaceStrings(scriptText);
		script = this.replaceVars(script);
		script = this.replaceAttributeStrings(script);
		script = this.replaceSystemStrings(script);

		// run through all keys in replacedVarsView and change all in script to use keyToTempVar() expression:
		// for (let key in this.replacedVarsView) {
		// 	let value = this.keyToTempVar(key);
		// 	let regex = new RegExp(_.escapeRegExp(key), 'g');
		// 	script = script.replace(regex, value);
		// }

		return this._finalizeHiding(script);
	}

	/**
	 * Replace all variables back to their original names.
	 * @param {String} hiddenScriptText text of your code.
	 * @returns {String} text with original variables.
	 */
	showVars(hiddenScriptText) {
		for (let key in this.replacedVarsView) {
			let value = this.replacedVarsView[key];
			let regex = new RegExp(_.escapeRegExp(this.keyToTempVar(key)), 'g');
			hiddenScriptText = hiddenScriptText.replace(regex, value);
		}
		return hiddenScriptText;
	}

	/**
	 * Find all strings in the script text.
	 * Adds to the replacedVarsView object.
	 * @param {String} scriptText text of your code.
	 * @return {String} text with hidden variables. 
	 */
	replaceStrings(scriptText) {
    const regexToUse = /(".*?"|'.*?')/gmi;
    return this._replaceStuff(scriptText, regexToUse);
	}

	/**
	 * Find all (AMPscript) variables in the script text.
	 * Adds to the replacedVarsView object.
	 * @param {String} scriptText text of your code.
	 * @return {String} text with hidden variables. 
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
	 * @return {String} text with hidden variables. 
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
	 * @return {String} text with hidden variables.
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
		this.logger.log(`----- ${regexToUse} -----\n`);
		let match;
		let matches = new Map();

		while ((match = regexToUse.exec(scriptText)) !== null) {
			let varName = match[0];
			let varNameLower = varName.toLowerCase();
			if (!matches.has(varNameLower)) {
				let simplifiedName = this.varGenerator.next().value;
				matches.set(varNameLower, {original: varName, simplified: simplifiedName});
			}
		}

		// Convert the Map to an array of objects, then sort them by their first appearance in the script text
		let sortedMatches = Array.from(matches.values()).sort((a, b) => scriptText.indexOf(a.original) - scriptText.indexOf(b.original));

		for (let match of sortedMatches) {
			this.replacedVarsView[match.simplified] = match.original;
		}

		sortedMatches.sort((a, b) => b.original.length - a.original.length);
		this.logger.log(`replacedVarsView:`, this.replacedVarsView);

		// Replace the original variable names in the script text with the simplified names
		let modifiedScriptText = scriptText;
		for (let match of sortedMatches) {
				let regex = new RegExp(_.escapeRegExp(match.original), 'gi');
				this.logger.log(`regex for: ${match}:`, regex);
				modifiedScriptText = modifiedScriptText.replace(regex, match.simplified);
		}
		this.logger.log(`>>>>>>>>>>\n`, modifiedScriptText, `\n<<<<<<<<<<<<`);
		return modifiedScriptText;
	}

	/**
	 * Finalize hiding process - replace all variables in the script text with simplified var names.
	 * @param {String} scriptText text of your code.
	 * @return {String} text with hidden variables.
	 */
	_finalizeHiding(scriptText) {
		let script = scriptText;
		// run through all keys in replacedVarsView and change all in script to use keyToTempVar() expression:
		for (let key in this.replacedVarsView) {
			let value = this.keyToTempVar(key);
			let regex = new RegExp(_.escapeRegExp(key), 'g');
			script = script.replace(regex, value);
		}
		return script;
	}

	keyToTempVar(input) {
		let output = input.replace(/#(\w\d)#/g, "@$1");
		return output;
	}

	/**
	 * Generator for variable names.
	 * @returns {String} simplified variable name.
	 */
	*getNextVarName() {
		let vars = 'abcdefghijklmnopqrstuvwxyz'.split('');
		let index = 0;
		let number = 0;

		while (true) {
			if (index >= vars.length) {
				index = 0;
				number++;
			}
			yield `#${vars[index++]}${number}#`;
		}
	}
};