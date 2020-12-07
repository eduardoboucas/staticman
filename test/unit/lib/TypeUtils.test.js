import assertString from '../../../source/lib/TypeUtils';

describe('TypeUtils', () => {
  describe('assertString', () => {
    it('does not throw a type error when passed a string', () => {
      expect(() => assertString('Some string')).not.toThrow();
    });

    it('does not throw a type error when passed a string with special characters', () => {
      expect(() => assertString('Some string !@#$%%^^&*(^_(_)_')).not.toThrow();
    });

    it('does not throw a type error when passed a multiline string', () => {
      expect(() =>
        assertString(`This string
      
      
      
      is many lines`)
      ).not.toThrow();
    });

    it('throws a type error when passed a boolean', () => {
      expect(() => assertString(true)).toThrow(TypeError);
    });

    it('throws a type error when passed an object', () => {
      expect(() => assertString({})).toThrow(TypeError);
    });
  });
});
