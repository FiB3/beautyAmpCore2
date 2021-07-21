const beautifier = require('../beauty-amp-core');

test('crappy test', () => {
  const testCase = `<h1>broken by the "next"</h1>
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
]%%`.split('\n');

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

  const res = beautifier.beautify(testCase);
  expect(res).toBe(testRes);
});