JavaScript language features coverage
=====================================

List below is based on the [ES3 Standard](http://www-archive.mozilla.org/js/language/E262-3.pdf), mainly sections 11, 12 and 15.

### Statements

 - [x] **Block statement**
 - [x] **`var`**
 - [x] **Empty statement**
 - [x] **Expression statement**
 - [x] **`if` `else`**
 - [x] **`do` `while`**
 - [x] **`while`**
 - [x] **`for`**
 - [x] **`for` `of`**
 - [x] **`for` `in`**
 - [x] **`continue`**
 - [x] **`break`** _(partial: labels not supported)_
 - [x] **`return`**
 - [ ] `switch`
 - [ ] `with`
 - [ ] Labelled statements
 - [ ] ~~`throw`~~  _(will not be implemented)_
 - [ ] ~~`try`~~  _(will not be implemented)_
 - [x] **Function definition `function` ident `() {` ... `}`** _(only in global scope)_


### Expressions

 - [ ] Primary Expressions
    - [ ] `this`
    - [x] **Identifier reference**
    - [x] Literal
        - [x] **`null`**
        - [x] **`true` / `false`**
        - [x] **number literal** _(partial: only 16-bit integers)_
        - [x] **string literal**
        - [x] **regular expression literal** _(partial: only in direct calls to String.search)_
    - [x] **Array initializer `[` ... `]`** 
    - [x] **Object initializer `{` ... `}`**
    - [x] **Grouping operator `(` `)`**
 - [ ] Left-hand-side Expressions
    - [x] **Property accessors**
    - [ ] `new` operator
    - [x] **Function call**
    - [x] **Argument list**
    - [ ] Function expression `function() {` ... `}`
 - [x] **Postfix expressions**
    - [x] **`--`**
    - [x] **`++`**
 - [ ] Unary operators
    - [ ] `delete`
    - [ ] `void`
    - [ ] `typeof`
    - [x] **Prefix increment operator `++`**
    - [x] **Prefix decrement operator `--`**
    - [x] **Unary `+`**
    - [ ] Unary `-`
    - [ ] Bitwise NOT `~`
    - [x] **Logical NOT `!`**
 - [ ] Multiplicative operators
    - [x] **`*`** _(only numbers)_
    - [ ] `/`
    - [ ] `%`
 - [ ] Additive operators
    - [x] **`+`** _(partial: number+number, string+number, string+string)_
    - [x] **`-`** _(only numbers)_
 - [ ] Bitwise shift operators
    - [ ] `<<`
    - [ ] `>>`
    - [ ] `>>>`
 - [ ] Relational operators
    - [x] **`<`** _(only numbers)_
    - [x] **`>`** _(only numbers)_
    - [x] **`<=`** _(only numbers)_
    - [x] **`>=`** _(only numbers)_
    - [ ] `instanceof`
    - [ ] `in`
 - [x] Equality operators
    - [x] **`==`** _(partial: number+number, string+number, string+string)_
    - [x] **`!=`** _(partial: number+number, string+number, string+string)_
    - [x] **`===`** _(partial: number+number, string+string)_
    - [x] **`!==`** _(partial: number+number, string+string)_
 - [ ] Binary bitwise operators
    - [ ] `&`
    - [ ] `|`
    - [ ] `^`
 - [x] Binary logical operators
    - [x] **`&&`**
    - [x] **`||`**
 - [x] **Conditional operator `?` `:`**
 - [ ] Assignment operators
    - [x] **Simple assignment `=`** _(only as statement)_
    - [ ] Compound assignments `+=`, `-=`, `*=`, `/=`, `%=`, `<<=`, `>>=`, `>>>=`, `&=`, `^=`, `|=`
 - [ ] Comma operator

### Built-in objects

 - [ ] Global
     - [ ] NaN
     - [ ] Infinity
     - [ ] undefined
     - [ ] ~~eval~~  _(will not be implemented)_
     - [ ] parseInt
     - [ ] parseFloat
     - [ ] isNaN
     - [ ] isFinite
     - [ ] decodeURI
     - [ ] decodeURIComponent
     - [ ] encodeURI
     - [ ] encodeURIComponent
 - [ ] Object
     - [ ] new
     - [ ] toString
     - [ ] toLocaleString
     - [ ] hasOwnProperty
     - [ ] isPrototypeOf
     - [ ] propertyIsEnumerable
 - [ ] Function
     - [ ] ~~new~~  _(will not be implemented)_
     - [ ] toString
     - [ ] apply
     - [ ] call
 - [ ] Array
     - [ ] new
     - [ ] toString
     - [ ] toLocaleString
     - [x] **concat**
     - [x] **join**
     - [x] **pop**
     - [x] **push**
     - [ ] reverse
     - [x] **shift**
     - [x] **slice** _(partial: no bounds checking)_
     - [x] **sort** _(partial: sort function as parameter not supported)_
     - [x] **splice** _(partial: no bounds checking)_
     - [x] **unshift**
     - [x] **length**
     - [x] **indexOf**
     - [x] **lastIndexOf**
 - [ ] String
     - [ ] new
     - [ ] toString
     - [ ] valueOf
     - [ ] charAt
     - [ ] charCodeAt
     - [ ] concat
     - [x] **indexOf**
     - [x] **lastIndexOf**
     - [ ] localeCompare
     - [ ] match
     - [ ] replace
     - [x] **search** _(partial: only with regex literal directly as parameter)_
     - [ ] slice
     - [ ] split
     - [ ] substring
     - [ ] toLowerCase
     - [ ] toLocaleLowerCase
     - [ ] toUpperCase
     - [ ] toLocaleUpperCase
     - [x] **length**
 - [ ] Boolean
     - [ ] new
     - [ ] toString
     - [ ] valueOf
 - [ ] Number
     - [ ] new
     - [ ] MAX_VALUE
     - [ ] MIN_VALUE
     - [ ] NaN
     - [ ] NEGATIVE_INFINITY
     - [ ] POSITIVE_INFINITY
     - [ ] toString
     - [ ] toLocaleString
     - [ ] valueOf
     - [ ] toFixed
     - [ ] toExponential
     - [ ] toPrecision
 - [ ] Math
     - [ ] LN10
     - [ ] LN2
     - [ ] LOG2E
     - [ ] LOG10E
     - [ ] PI
     - [ ] SQRT1_2
     - [ ] SQRT2
     - [ ] abs
     - [ ] acos
     - [ ] asin
     - [ ] atan
     - [ ] atan2
     - [ ] ceil
     - [ ] cos
     - [ ] exp
     - [ ] floor
     - [ ] log
     - [ ] max
     - [ ] min
     - [ ] pow
     - [ ] random
     - [ ] round
     - [ ] sin
     - [ ] sqrt
     - [ ] tan
 - [ ] Date
     - [ ] new
     - [ ] Date (as function)
     - [ ] now
     - [ ] parse
     - [ ] UTC
     - [ ] toString
     - [ ] toDateString
     - [ ] toTimeString
     - [ ] toLocaleString
     - [ ] toLocaleTimeString
     - [ ] valueOf
     - [ ] getTime
     - [ ] getFullYear
     - [ ] getUTCFullYear
     - [ ] getMonth
     - [ ] getUTCMonth
     - [ ] getDay
     - [ ] getUTCDay
     - [ ] getHours
     - [ ] getUTCHours
     - [ ] getMinutes
     - [ ] getUTCMinutes
     - [ ] getSeconds
     - [ ] getUTCSeconds
     - [ ] getMilliseconds
     - [ ] getUTCMilliseconds
     - [ ] getTimezoneOffset
     - [ ] setTime
     - [ ] setFullYear
     - [ ] setUTCFullYear
     - [ ] setMonth
     - [ ] setUTCMonth
     - [ ] setDay
     - [ ] setUTCDay
     - [ ] setHours
     - [ ] setUTCHours
     - [ ] setMinutes
     - [ ] setUTCMinutes
     - [ ] setSeconds
     - [ ] setUTCSeconds
     - [ ] setMilliseconds
     - [ ] setUTCMilliseconds
     - [ ] toUTCString
 - [ ] RegExp
     - [ ] RegExp (as function)
     - [ ] new
     - [ ] exec
     - [ ] test
     - [ ] toString
     - [ ] source
     - [ ] global
     - [ ] ignoreCase
     - [ ] multiline
     - [ ] lastIndex
 - [ ] ~~Error objects~~ _(will not be implemented)_