const fs = require('fs');
const path = require('path');

const setup = require('../src/setup');

jest.mock('fs');

describe('setup.js', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('lookForSetupFile', () => {
    it('should return false if .beautyamp.json does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      expect(setup.lookForSetupFile()).toBe(false);
    });

    it('should return parsed JSON if .beautyamp.json exists', () => {
      const mockData = { foo: 'bar' };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockData));
      expect(setup.lookForSetupFile()).toEqual(mockData);
    });
  });

  describe('setup', () => {
    it('should update setupData based on provided parameters', () => {
      const ampscript = { capitalizeAndOrNot: false, maxParametersPerLine: 2 };
      const editor = { insertSpaces: false, tabSize: 2 };
      setup.setup(ampscript, editor);

      expect(setup.ampscript.capitalizeAndOrNot).toBe(false);
      expect(setup.ampscript.maxParametersPerLine).toBe(2);
      expect(setup.editor.insertSpaces).toBe(false);
      expect(setup.editor.tabSize).toBe(2);
    });

    it('should update setupData based on .beautyamp.json if it exists', () => {
      const mockData = { ampscript: { capitalizeAndOrNot: false }, editor: { insertSpaces: false } };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      setup.setup();

      expect(setup.ampscript.capitalizeAndOrNot).toBe(false);
      expect(setup.editor.insertSpaces).toBe(false);
    });
  });
});