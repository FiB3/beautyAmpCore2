const beautifier = require(process.env.NODE_ENV === 'production' ? '../dist/beauty-amp-core.js' : '../beauty-amp-core');

console.log(`Testing for: ${process.env.NODE_ENV} (production? ${process.env.NODE_ENV === 'production'}).`);

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
        /**
            * example on how to use this
            * example on how to use this
        */
    ]%%
    
    %%[
        /* example on how to use this
        */
        SET @Title = IIF(EMPTY(@Title) OR @Title=="\'Without title" OR @Title==Concat('<a href="mailto: ', @rawStoreEmail, '">', @rawStoreEmail, '</a>'    ) OR @Title==EMPTY(@Title), '', Concat(' ', @Title))
    ]%%
`;

  const testRes = `
%%[
    /**
     * example on how to use this
     * example on how to use this
     */
]%%

%%[
    /* example on how to use this
     */
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

test("Function Multiline", async () => {
    let testCase = `%%[ CreateSalesforceRecord('Lead', 'Id', '00Q123456789999XXX', 'Name', 'John Doe')
    set @X = UpdateSalesforceRecord('Lead', 'Id', '00Q123456789999XXX') ]%%`;

    let testRes = `
%%[
    CreateSalesforceRecord(
        'Lead',
        'Id',
        '00Q123456789999XXX',
        'Name',
        'John Doe'
    )
    SET @X = UpdateSalesforceRecord('Lead', 'Id', '00Q123456789999XXX')
]%%
`;

    const res = await beautifier.beautify(testCase);
    expect(!Array.isArray(res)).toBeTruthy();
    expect(res).toStrictEqual(testRes);
});


test("ELSE-Plain-function-bug", async () => {
    let testCase = `%%[ IF Length(@msg) == 0 THEN 
        SET @response = 'You have unsubscribed and will no longer receive any messages.|' 
        ENDIF
    ELSE InsertData( @unsubEvents, 
        'MobileNumber', @num, 'Message', [MSG(0).NOUNS], 'Status', 'Not Found' )  ENDIF ]%%`;

    let testRes = `
%%[
    IF Length(@msg) == 0 THEN
        SET @response = 'You have unsubscribed and will no longer receive any messages.|'
    ENDIF
ELSE
    InsertData(
        @unsubEvents,
        'MobileNumber',
        @num,
        'Message',
        [MSG(0).NOUNS],
        'Status',
        'Not Found'
    )
ENDIF
]%%
`;

    const res = await beautifier.beautify(testCase);
    expect(!Array.isArray(res)).toBeTruthy();
    expect(res).toStrictEqual(testRes);
});


test("Comment block indenting bug fix", async () => {
    let testCase = `%%[     v(@AMPscript)
        /* comment */
        
        SET @val = 42
        SET @word = "Hello World!"
    ]%%`;

    let testRes = `
%%[
    v(@AMPscript)
    /* comment */
    SET @val = 42
    SET @word = "Hello World!"
]%%
`;

    const res = await beautifier.beautify(testCase);
    expect(!Array.isArray(res)).toBeTruthy();
    expect(res).toStrictEqual(testRes);
});


test("Standalone method after keyword", async () => {
    let testCase = `%%[
        var @x, @i	
        /**
                    * comment 1
                    * example 2
            */
            IF @title == 'Hello World!' THEN
                OutputLine(Concat('Hello ', 'World!'))
            ENDIF
    
            FOR @i to 3 DO
            OutputLine(Concat('Hello', ' ', 'World!'))
    
            SET @x = 'stuff'
            NEXT @i
    ]%%`;

    let testRes = `
%%[
    VAR @x, @i
    /**
     * comment 1
     * example 2
     */
    IF @title == 'Hello World!' THEN
        OutputLine(Concat('Hello ', 'World!'))
    ENDIF
    FOR @i TO 3 DO
        OutputLine(Concat('Hello', ' ', 'World!'))
        SET @x = 'stuff'
    NEXT @i
]%%
`;

    const res = await beautifier.beautify(testCase);
    expect(!Array.isArray(res)).toBeTruthy();
    expect(res).toStrictEqual(testRes);
});

// TODO: this won't work when "Next is present in variable"
test("HTML Off", async () => {
    let testCase = `<p>TEST</p>

    </br>
    %%[
        IF EMPTY(@NxtJob) THEN
            SET @NxtJob = 7
        ENDIF
    ]%%`;

    let testRes = `<p>TEST</p>

    </br>
%%[
    IF EMPTY(@NxtJob) THEN
        SET @NxtJob = 7
    ENDIF
]%%
`;

    const res = await beautifier.beautify(testCase, false);
    expect(!Array.isArray(res)).toBeTruthy();
    expect(res).toStrictEqual(testRes);
});

test("Next-in-variable-fix", async () => {
    let testCase = `<p>TEST</p>

    </br>
    %%[
        IF EMPTY(@NextJob) THEN
            SET @NextJob = 7
        ENDIF
    ]%%`;

    let testRes = `<p>TEST</p>

    </br>
%%[
    IF EMPTY(@NextJob) THEN
        SET @NextJob = 7
    ENDIF
]%%
`;

    const res = await beautifier.beautify(testCase, false);
    expect(!Array.isArray(res)).toBeTruthy();
    expect(res).toStrictEqual(testRes);
});

test("Test with HTML, CSS and Javascript.", async () => {
    let testCase = `<head>
    <style>body{ background-color: #f4f4f4;}
    </style>
    </head>
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

const testRes = `<head>
    <style>
        body{ background-color: #f4f4f4;}
    </style>
</head>
<div id="test">
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