const formatters = require('../src/formatters');

describe('formatters', () => {
  describe('splitParameters', () => {
    it('should split parameters correctly', () => {
      const input = 'param1, param2, param3';
      const expected = ['param1', ' param2', ' param3'];
      const result = formatters.splitParameters(input);
      expect(result).toEqual(expected);
    });

    it('should handle nested functions correctly', () => {
      const input = 'param1, func(param2, param3), param4';
      const expected = ['param1', ' func(param2, param3)', ' param4'];
      const result = formatters.splitParameters(input);
      expect(result).toEqual(expected);
    });
  });

  describe('splitMethodParams', () => {
    it('should split method parameters correctly', () => {
      const input = 'methodName(param1, param2, param3)';
      const expected = ['methodName(', 'param1, param2, param3', ')'];
      const result = formatters.splitMethodParams(input);
      expect(result).toEqual(expected);
    });

    it('should handle nested functions correctly', () => {
      const input = 'methodName(param1, func(param2, param3), param4)';
      const expected = ['methodName(', 'param1, func(param2, param3), param4', ')'];
      const result = formatters.splitMethodParams(input);
      expect(result).toEqual(expected);
    });
  });
});