
# Look at jshint's warnings for many, many ideas: http://jshint.com/docs/options
# And there are others in the Closure compiler: https://developers.google.com/closure/compiler/docs/error-ref
# And maybe some more here: https://gist.github.com/textarcana/3375708#file_js_code_sniffs.md
# More: https://github.com/mdevils/node-jscs/blob/master/lib/checker.js
# More: https://github.com/nzakas/eslint/tree/master/lib/rules

module.exports = problems =
  # Based on Esprima Harmony's error messages, which track V8's
  # https://github.com/ariya/esprima/blob/harmony/esprima.js#L194
  # TODO: the values here shuold be something else...
  esprima:
    UnexpectedToken: {message: 'Unexpected token %0', level: "error"}
    UnexpectedNumber: {message: 'Unexpected number', level: "error"}
    UnexpectedString: {message: 'Unexpected string', level: "error"}
    UnexpectedIdentifier: {message: 'Unexpected identifier', level: "error"}
    UnexpectedReserved: {message: 'Unexpected reserved word', level: "error"}
    UnexpectedTemplate: {message: 'Unexpected quasi %0', level: "error"}
    UnexpectedEOS: {message: 'Unexpected end of input', level: "error"}
    NewlineAfterThrow: {message: 'Illegal newline after throw', level: "error"}
    InvalidRegExp: {message: 'Invalid regular expression', level: "error"}
    UnterminatedRegExp: {message: 'Invalid regular expression: missing /', level: "error"}
    InvalidLHSInAssignment: {message: 'Invalid left-hand side in assignment', level: "error"}
    InvalidLHSInFormalsList: {message: 'Invalid left-hand side in formals list', level: "error"}
    InvalidLHSInForIn: {message: 'Invalid left-hand side in for-in', level: "error"}
    MultipleDefaultsInSwitch: {message: 'More than one default clause in switch statement', level: "error"}
    NoCatchOrFinally: {message: 'Missing catch or finally after try', level: "error"}
    UnknownLabel: {message: 'Undefined label \'%0\'', level: "error"}
    Redeclaration: {message: '%0 \'%1\' has already been declared', level: "error"}
    IllegalContinue: {message: 'Illegal continue statement', level: "error"}
    IllegalBreak: {message: 'Illegal break statement', level: "error"}
    IllegalDuplicateClassProperty: {message: 'Illegal duplicate property in class definition', level: "error"}
    IllegalReturn: {message: 'Illegal return statement', level: "error"}
    IllegalYield: {message: 'Illegal yield expression', level: "error"}
    IllegalSpread: {message: 'Illegal spread element', level: "error"}
    StrictModeWith: {message: 'Strict mode code may not include a with statement', level: "error"}
    StrictCatchVariable: {message: 'Catch variable may not be eval or arguments in strict mode', level: "error"}
    StrictVarName: {message: 'Variable name may not be eval or arguments in strict mode', level: "error"}
    StrictParamName: {message: 'Parameter name eval or arguments is not allowed in strict mode', level: "error"}
    StrictParamDupe: {message: 'Strict mode function may not have duplicate parameter names', level: "error"}
    ParameterAfterRestParameter: {message: 'Rest parameter must be final parameter of an argument list', level: "error"}
    DefaultRestParameter: {message: 'Rest parameter can not have a default value', level: "error"}
    ElementAfterSpreadElement: {message: 'Spread must be the final element of an element list', level: "error"}
    ObjectPatternAsRestParameter: {message: 'Invalid rest parameter', level: "error"}
    ObjectPatternAsSpread: {message: 'Invalid spread argument', level: "error"}
    StrictFunctionName: {message: 'Function name may not be eval or arguments in strict mode', level: "error"}
    StrictOctalLiteral: {message: 'Octal literals are not allowed in strict mode.', level: "error"}
    StrictDelete: {message: 'Delete of an unqualified identifier in strict mode.', level: "error"}
    StrictDuplicateProperty: {message: 'Duplicate data property in object literal not allowed in strict mode', level: "error"}
    AccessorDataProperty: {message: 'Object literal may not have data and accessor property with the same name', level: "error"}
    AccessorGetSet: {message: 'Object literal may not have multiple get/set accessors with the same name', level: "error"}
    StrictLHSAssignment: {message: 'Assignment to eval or arguments is not allowed in strict mode', level: "error"}
    StrictLHSPostfix: {message: 'Postfix increment/decrement may not have eval or arguments operand in strict mode', level: "error"}
    StrictLHSPrefix: {message: 'Prefix increment/decrement may not have eval or arguments operand in strict mode', level: "error"}
    StrictReservedWord: {message: 'Use of future reserved word in strict mode', level: "error"}
    NewlineAfterModule: {message: 'Illegal newline after module', level: "error"}
    NoFromAfterImport: {message: 'Missing from after import', level: "error"}
    InvalidModuleSpecifier: {message: 'Invalid module specifier', level: "error"}
    NestedModule: {message: 'Module declaration can not be nested', level: "error"}
    NoYieldInGenerator: {message: 'Missing yield in generator', level: "error"}
    NoUnintializedConst: {message: 'Const must be initialized', level: "error"}
    ComprehensionRequiresBlock: {message: 'Comprehension must have at least one block', level: "error"}
    ComprehensionError: {message: 'Comprehension Error', level: "error"}
    EachNotAllowed: {message: 'Each is not supported', level: "error"}

  aetherLint:
    # Errors: things that will error out and thus prevent us from compiling the code (syntax errors, missing variables, typos)
    UnexpectedIdentifier: {message: 'UnexpectedIdentifier', level: 'error'}
    MissingVarKeyword: {message: 'MissingVarKeyword', level: 'error'}
    UndefinedVariable: {message: 'UndefinedVariable', level: 'error'}
    MissingThis: {message: 'MissingThis', level: 'error'}
    # ... many more errors ...

    # Warnings: things that we think might cause runtime errors or bugs, but aren't sure (statements that don't do anything, variables which are defined and not used, weird operator precedence issues, etc.)
    NoEffect: {message: 'NoEffect', level: 'warning'}
    FalseBlockIndentation: {message: 'FalseBlockIndentation', level: 'warning'}
    UndefinedProperty: {message: 'UndefinedProperty', level: 'warning'}
    # ... many more warnings ...

    # Info: things that are usually bad code (missing semicolons, bad indentation, multiple statements on a line, for..in loops where we think they're doing arrays, really long lines, bad_case_conventions)
    InconsistentIndentation: {message: 'InconsistentIndentation', level: 'info'}
    SnakeCase: {message: 'SnakeCase', level: 'info'}
    # ... many more infos ...

    SingleQuotes: {message: 'SingleQuotes', level: "ignore"}
    DoubleQuotes: {message: 'DoubleQuotes', level: "ignore"}
    CamelCase: {message: 'CamelCase', level: 'ignore'}
    # ... many more problems ignored by default ...

  jsHint:
    TODO: {message: "TODO", level: "ignore"}