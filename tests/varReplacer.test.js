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
			expect(generator.next().value).toStrictEqual('#a0#');
			expect(generator.next().value).toStrictEqual('#b0#');

			for (let i = 0; i < 24; i++) {
				generator.next();
			}
			expect(generator.next().value).toStrictEqual('#a1#');
    });
  });

	describe('replaceStrings()', () => {
    it('should return all strings', () => {
      const scriptText = `
IIF(EMPTY([Member ID]) and @mId == "LANDINGPAGE" THEN
SET @MemberID = 'No Member ID'
ENDIF

SET @offset = Concat('some msg:', "to be", "shown")
			`;
			const expectedRes = `
IIF(EMPTY([Member ID]) and @mId == #a0# THEN
SET @MemberID = #b0#
ENDIF

SET @offset = Concat(#c0#, #d0#, #e0#)
			`;

			const result = varReplacer.replaceStrings(scriptText);
			expect(varReplacer.replacedVarsView).toEqual({
					"#a0#": `"LANDINGPAGE"`,
					"#b0#": `'No Member ID'`,
					"#c0#": `'some msg:'`,
					"#d0#": `"to be"`,
					"#e0#": `"shown"`
			});
			expect(result).toEqual(expectedRes);
    });
  });
	
	describe('replaceVars()', () => {
    it('should return all variables', () => {
      const scriptText = `
			@Title = IIF(EMPTY(@Title)
			SET @Title = IIF(EMPTY(@Title) OR @Title=="\'Without title" OR @Title==Concat(
							'<a href="mailto: ', @rawStoreEmail)
			If ( @CtaCode == "Whatsnext" or @CtaCode=="Rprhist_AS") then 
			SET @n = "msg: test"
			SET @NextKey = IIF(EMPTY(@NextKey), 7, @NextKey)
			v(@AMPscript)
			`;
			const expectedRes = `
			#a0# = IIF(EMPTY(#a0#)
			SET #a0# = IIF(EMPTY(#a0#) OR #a0#=="\'Without title" OR #a0#==Concat(
							'<a href="mailto: ', #b0#)
			If ( #c0# == "Whatsnext" or #c0#=="Rprhist_AS") then 
			SET #d0# = "msg: test"
			SET #e0# = IIF(EMPTY(#e0#), 7, #e0#)
			v(#f0#)
			`;

			const result = varReplacer.replaceVars(scriptText);
			expect(varReplacer.replacedVarsView).toEqual({
					"#a0#": "@Title",
					"#b0#": "@rawStoreEmail",
					"#c0#": "@CtaCode",
					"#d0#": "@n",
					"#e0#": "@NextKey",
					"#f0#": "@AMPscript",
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
IIF(EMPTY(#a0#) THEN
SET @MemberID = "No Member ID"
ELSE
SET @MemberID = #a0#
ENDIF
SET @AMPscript = #b0#`;
			const result = varReplacer.replaceAttributeStrings(scriptText);
			expect(varReplacer.replacedVarsView).toEqual({
					"#a0#": "[Member ID]",
					"#b0#": "[ampscript]"
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
IIF(EMPTY([Member ID]) and #a0# == "LANDINGPAGE" THEN
SET @MemberID = "No Member ID"
ENDIF
SET @offset = #b0#`;
			const result = varReplacer.replaceSystemStrings(scriptText);
			// expect(varReplacer.replacedVarsView).toEqual({
			// 		"#a0#": "_messagecontext",
			// 		"#b0#": "_UTCOffset"
			// });
			expect(result).toEqual(expectedRes);
    });
  });

  describe('hideVars', () => {
    it('should hide values from the script text', () => {
      const scriptText = `
@Title = IIF(EMPTY(@Title))
SET @Title = IIF(EMPTY(@Title) OR @Title=="\'Without title" OR @Title==Concat(
		'<a href="mailto: ', @rawStoreEmail))
If ( @CtaCode == "Whatsnext" or @CtaCode== [Member ID] ) then 
SET @m = "msg: filip@gmail.com"
ENDIF
IIF(EMPTY([Member ID]) and _messagecontext == "LANDINGPAGE", "No Member ID", [Member ID])
SET @MemberID = "No Member ID"
SET @NextKey = IIF(EMPTY(@NextKey), 7, _UTCOffset)
v(@AMPscript)
`;
			const expectedRes = `
@g0 = IIF(EMPTY(@g0))
SET @g0 = IIF(EMPTY(@g0) OR @g0==@a0 OR @g0==Concat(
		@b0, @h0))
If ( @i0 == @c0 or @i0== @n0 ) then 
SET @j0 = @d0
ENDIF
IIF(EMPTY(@n0) and @o0 == @e0, @f0, @n0)
SET @k0 = @f0
SET @l0 = IIF(EMPTY(@l0), 7, @p0)
v(@m0)
`;

      const result = varReplacer.hideVars(scriptText);
			expect(varReplacer.replacedVarsView).toEqual({
				"#a0#": `"'Without title"`,
				"#b0#": `'<a href="mailto: '`,
				"#c0#": '"Whatsnext"',
				"#d0#": '"msg: filip@gmail.com"',
				"#e0#": '"LANDINGPAGE"',
				"#f0#": '"No Member ID"',
				"#g0#": '@Title',
				"#h0#": '@rawStoreEmail',
				"#i0#": '@CtaCode',
				"#j0#": '@m',
				"#k0#": '@MemberID',
				"#l0#": '@NextKey',
				"#m0#": '@AMPscript',
				"#n0#": '[Member ID]',
				"#o0#": '_messagecontext',
				"#p0#": '_UTCOffset'
			});
      expect(result).toEqual(expectedRes);
    });
  });

  describe('showVars', () => {
    it('should return the original script text', () => {
			varReplacer.replacedVarsView = {
				"#a0#": `"'Without title"`,
				"#b0#": `'<a href="mailto: '`,
				"#c0#": '"Whatsnext"',
				"#d0#": '"msg: filip@gmail.com"',
				"#e0#": '"LANDINGPAGE"',
				"#f0#": '"No Member ID"',
				"#g0#": '@Title',
				"#h0#": '@rawStoreEmail',
				"#i0#": '@CtaCode',
				"#j0#": '@m',
				"#k0#": '@MemberID',
				"#l0#": '@NextKey',
				"#m0#": '@AMPscript',
				"#n0#": '[Member ID]',
				"#o0#": '_messagecontext',
				"#p0#": '_UTCOffset'
			};

      const scriptText = `
			@g0 = IIF(EMPTY(@g0))
			SET @g0 = IIF(EMPTY(@g0) OR @g0==@a0 OR @g0==Concat(
					@b0, @h0))
			If ( @i0 == @c0 or @i0== @n0 ) then 
			SET @j0 = @d0
			ENDIF
			IIF(EMPTY(@n0) and @o0 == @e0, @f0, @n0)
			SET @k0 = @f0
			SET @l0 = IIF(EMPTY(@l0), 7, @p0)
			v(@m0)
			`;

			const expected = `
			@Title = IIF(EMPTY(@Title))
			SET @Title = IIF(EMPTY(@Title) OR @Title=="\'Without title" OR @Title==Concat(
					'<a href="mailto: ', @rawStoreEmail))
			If ( @CtaCode == "Whatsnext" or @CtaCode== [Member ID] ) then 
			SET @m = "msg: filip@gmail.com"
			ENDIF
			IIF(EMPTY([Member ID]) and _messagecontext == "LANDINGPAGE", "No Member ID", [Member ID])
			SET @MemberID = "No Member ID"
			SET @NextKey = IIF(EMPTY(@NextKey), 7, _UTCOffset)
			v(@AMPscript)
			`;


      const result = varReplacer.showVars(scriptText);
      expect(result).toEqual(expected);
    });
  });
});