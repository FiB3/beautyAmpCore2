const beautifier = require('../beauty-amp-core');



beforeEach(() => {
    beautifier.setup(undefined, undefined, {
        loggerOn: false
    });
});

test("NEXT in string test", () => {

  let testCase = `<h1>broken by the "next"</h1>
%%[VAR @FullCtaUrl 
If ( @CtaCode == "Whatsnext" or @CtaCode=="Rprhist_AS") then 
    If @emailId==1 Then
			Set @FullCtaUrl = Concat(@CtaUrl,'?roNumber=',@PreregistrationNumber)
    Else
			Set @FullCtaUrl = Concat(@CtaUrl,'?roNumber=',@OrderNumber)
		endif
Else
	Set @FullCtaUrl = @CtaUrl
endif
]%%`;

  const testRes = `<h1>broken by the "next"</h1>
%%[
    VAR @FullCtaUrl
    IF ( @CtaCode == "Whatsnext" OR @CtaCode=="Rprhist_AS") THEN
        IF @emailId==1 THEN
            SET @FullCtaUrl = Concat(@CtaUrl, '?roNumber=', @PreregistrationNumber)
        ELSE
            SET @FullCtaUrl = Concat(@CtaUrl, '?roNumber=', @OrderNumber)
        ENDIF
    ELSE
        SET @FullCtaUrl = @CtaUrl
    ENDIF
]%%
`;

  testCase = testCase.split('\n');

  const res = beautifier.beautify(testCase);
  expect(res).toBe(testRes);
});

test("IIF with nested function & multi-line comment", () => {
  let testCase = `
    %%[
        /*
            * example on how to use this
            * example on how to use this
        */
    ]%%
    
    %%[
        SET @Title = IIF(EMPTY(@Title) OR @Title=="\'Without title" OR @Title==Concat('<a href="mailto: ', @rawStoreEmail, '">', @rawStoreEmail, '</a>'    ) OR @Title==EMPTY(@Title), '', Concat(' ', @Title))
    ]%%
`;

  const testRes = `
%%[
    /*
    * example on how to use this
    * example on how to use this
    */
]%%

%%[
    SET @Title = IIF(EMPTY(@Title) OR @Title=="\'Without title" OR @Title==Concat(
        '<a href="mailto: ',
        @rawStoreEmail,
        '">',
        @rawStoreEmail,
        '</a>'
    ) OR @Title==EMPTY(@Title), '', Concat(' ', @Title))
]%%
`;


  testCase = testCase.split('\n');

  const res = beautifier.beautify(testCase);
  expect(res).toBe(testRes);
});
