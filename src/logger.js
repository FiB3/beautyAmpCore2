'use strict';

/**
 * Logger for the Beautifier. Currently supports only `console.log()`.
 */
module.exports = class Logger {
  /**
   * Constructor for logger.
   */
  constructor(setup) {
    this.setup(setup);
  }

  /**
   * Setup the logger.
   * @param {Object} setup
   *    {string} [logLevel=INFO] - Log level
   *    {Boolean} [loggerOn=false] loggerOn - enable the logger
   */
  setup(setup = { loggerOn: false, logLevel: 'INFO' }) {
    this.on = setup.loggerOn;
    this.onValue = this.on;
    this.level = typeof(setup.logLevel) === 'string' ? setup.logLevel : 'INFO';
  }

  enable() {
    this.on = this.onValue;
  }

  disable() {
    this.on = false;
  }

  log(...message) {
    this._log("INFO", ...message);
  }

  _log(level, ...message) {
    if (this.on) {
      if (level === 'INFO') {
        console.info(...message);
      } else if (level === 'DEBUG') {
        console.debug(...message);
      } else if (level === 'WARN') {
        console.warn(...message);
      } else if (level === 'ERROR') {
        console.error(...message);
      } else {
        console.log(...message);
      }
    }
  }
}
