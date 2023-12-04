const beautifier = require('../beauty-amp-core');

beforeEach(() => {
    beautifier.setup(undefined, undefined, {
        loggerOn: false
    });
});

test("Array as input", async () => {
    let testCase = [`<h1>My Test Case:</h1>`,
        `%%[ VAR @lang `,
        `If (@lang == 'EN') then Output("Hello World!")`,
        `Else`,
        `	Output("Ciao!")`,
        `endif`,
        `]%%`
    ];

    let testRes = [`<h1>My Test Case:</h1>`,
`%%[`,
`    VAR @lang`,
`    IF (@lang == 'EN') THEN`,
`        Output("Hello World!")`,
`    ELSE`,
`        Output("Ciao!")`,
`    ENDIF`,
`]%%`,
``];

    const res = await beautifier.beautify(testCase);
    expect(Array.isArray(res)).toBeTruthy();
    expect(res).toStrictEqual(testRes);
});

test("Array as string", async () => {
    let testCase = `<h1>My Test Case:</h1>
%%[ VAR @lang If (@lang == 'EN') then Output("Hello World!")
Else
	Output("Ciao!")
endif        ]%%`;

    let testRes = `<h1>My Test Case:</h1>
%%[
    VAR @lang
    IF (@lang == 'EN') THEN
        Output("Hello World!")
    ELSE
        Output("Ciao!")
    ENDIF
]%%
`;

    const res = await beautifier.beautify(testCase);
    expect(typeof(res)).toBe('string');
    expect(res).toBe(testRes);
});

test("NEXT in string test", async () => {

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

  let testRes = `<h1>broken by the "next"</h1>
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
  testRes = testRes.split('\n');

  const res = await beautifier.beautify(testCase);
  expect(Array.isArray(res)).toBeTruthy();
  expect(res).toStrictEqual(testRes);
});

test("IIF with nested function & multi-line comment", async () => {
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

  const res = await beautifier.beautify(testCase);
  expect(res).toBe(testRes);
});

test("HTML with IIF with nested function & multi-line comment", async () => {
    let testCase = `
    <p>TEST</p>
    %%[
            /*
                    * example on how to use this
                    * example on how to use this
            */
    ]%%
    <div class="test2">
        <p>Hello2</p>
        </div>
    %%[
            SET @Title = IIF(EMPTY(@Title) OR @Title=="\'Without title" OR @Title==Concat('<a href="mailto: ', @rawStoreEmail, '">', @rawStoreEmail, '</a>'    ) OR @Title==EMPTY(@Title), '', Concat(' ', @Title))
    ]%%
  `;
  
    const testRes = `<p>TEST</p>
%%[
    /*
    * example on how to use this
    * example on how to use this
    */
]%%
<div class="test2">
    <p>Hello2</p>
</div>
%%[
    SET @Title = IIF(EMPTY(@Title) OR @Title=="'Without title" OR @Title==Concat(
        '<a href="mailto: ',
        @rawStoreEmail,
        '">',
        @rawStoreEmail,
        '</a>'
    ) OR @Title==EMPTY(@Title), '', Concat(' ', @Title))
]%%    
  `;
  
    const res = await beautifier.beautify(testCase);
    expect(res).toBe(testRes);
  });

test("Test including HTML and Javascript.", async () => {
    let testCase = `
    <div id="test"><p>Hello</p>
    <div class="test2">
    <p>Hello2</p>
    </div></div>
    <script runat="server">Platform.Load("core", "1.1.1");
    /**
     * X...
     */
    try {
        Write('Hello World!');
    
        // var x;
        var x = {
            "a": 42,
            b: 3.14
        };
        /* TEST */
    } catch (err) {
        Write("Error: " + err + ". Message: " + err.message);
        }
    </script>
`;

const testRes = `<div id="test">
    <p>Hello</p>
    <div class="test2">
        <p>Hello2</p>
    </div>
</div>
<script runat="server">
    Platform.Load("core", "1.1.1");
    /**
     * X...
     */
    try {
        Write("Hello World!");

        // var x;
        var x = {
            a: 42,
            b: 3.14
        };
        /* TEST */
    } catch (err) {
        Write("Error: " + err + ". Message: " + err.message);
    }
</script>`;

const res = await beautifier.beautify(testCase);
expect(res).toBe(testRes);
});