const VarReplacer = require('../src/varReplacer');

describe('VarReplacer', () => {
  let varReplacer;
  let logger;

  beforeEach(() => {
    // logger = console;
    varReplacer = new VarReplacer();
  });

	describe('getNextVarName', () => {
    it('should generate variable names', () => {
      const generator = varReplacer.getNextVarName();
			expect(generator.next().value).toStrictEqual('a0');
			expect(generator.next().value).toStrictEqual('b0');

			for (let i = 0; i < 24; i++) {
				generator.next();
			}
			expect(generator.next().value).toStrictEqual('a1');
    });
  });

	describe('replaceVars()', () => {
    it('should return all variable names, each only once', () => {
      const scriptText = `
			@Title = IIF(EMPTY(@title)
			SET @Title = IIF(EMPTY(@title) OR @Title=="\'Without title" OR @Title==Concat(
							'<a href="mailto: ', @rawStoreEmail)
			If ( @CtaCode == "Whatsnext" or @CtaCode=="Rprhist_AS") then 
			SET @m = "msg: test"
			SET @NextKey = IIF(EMPTY(@NextKey), 7, @NextKey)
			v(@AMPscript)
			`;
			const expectedRes = `
			a0 = IIF(EMPTY(a0)
			SET a0 = IIF(EMPTY(a0) OR a0=="\'Without title" OR a0==Concat(
							'<a href="mailto: ', b0)
			If ( c0 == "Whatsnext" or c0=="Rprhist_AS") then 
			SET d0 = "msg: test"
			SET e0 = IIF(EMPTY(e0), 7, e0)
			v(f0)
			`;

			const result = varReplacer.replaceVars(scriptText);
			expect(varReplacer.replacedVarsView).toEqual({
					"a0": "@Title",
					"b0": "@rawStoreEmail",
					"c0": "@CtaCode",
					"d0": "@m",
					"e0": "@NextKey",
					"f0": "@AMPscript",
			});
			expect(result).toEqual(expectedRes);
    });
  });

	describe('replaceAttributeStrings()', () => {
    it('should return all attribute strings names, each only once', () => {
      const scriptText = `
IIF(EMPTY([Member ID]) THEN
SET @MemberID = "No Member ID"
ELSE
SET @MemberID = [Member ID]
ENDIF
SET @AMPscript = [ampscript]`;

			const expectedRes = `
IIF(EMPTY(a0) THEN
SET @MemberID = "No Member ID"
ELSE
SET @MemberID = a0
ENDIF
SET @AMPscript = b0`;
			const result = varReplacer.replaceAttributeStrings(scriptText);
			expect(varReplacer.replacedVarsView).toEqual({
					"a0": "[Member ID]",
					"b0": "[ampscript]"
			});
			expect(result).toEqual(expectedRes);
    });
  });

	describe('replaceSystemStrings()', () => {
    it('should return all system string names, each only once', () => {
      const scriptText = `
IIF(EMPTY([Member ID]) and _messagecontext == "LANDINGPAGE" THEN
SET @MemberID = "No Member ID"
ENDIF
SET @offset = _UTCOffset`;


			const expectedRes = `
IIF(EMPTY([Member ID]) and a0 == "LANDINGPAGE" THEN
SET @MemberID = "No Member ID"
ENDIF
SET @offset = b0`;
			const result = varReplacer.replaceSystemStrings(scriptText);
			// expect(varReplacer.replacedVarsView).toEqual({
			// 		"a0": "_messagecontext",
			// 		"b0": "_UTCOffset"
			// });
			expect(result).toEqual(expectedRes);
    });
  });

  // describe('hideVars', () => {
  //   it('should return the same script text', () => {
  //     const scriptText = 'var x = 10;';
  //     const result = varReplacer.hideVars(scriptText);
  //     expect(result).toEqual(scriptText);
  //   });
  // });

  // describe('showVars', () => {
  //   it('should return the same script text', () => {
  //     const scriptText = 'var x = 10;';
  //     const result = varReplacer.showVars(scriptText);
  //     expect(result).toEqual(scriptText);
  //   });
  // });
});