var fs = require('fs');
var cp = require('child_process');

var testTheTests = false;
var insideAether = true;

try {
	require("../aether.js")
} catch ( e ) {
	insideAether = false;
}

if ( false ) {
	var x = describe;
	describe = function( ) { }
	var fdescribe = x
}

if ( !insideAether ) {
	var escodegen = require('escodegen');
	var cashew = require('../../cashew.js');
	var evaluateJS =function (type, body, extra) {
		var buffer = "";
		cashew.___JavaRuntime.functions.print = function(what) {
			buffer += what + "\n";
		}
		var code = [
			'public class MyClass {',
			'	' + extra.join("\n\t"),
			'	public static ' + type + ' output() {',
			'		' + body.join("\n\t\t"),
			'	}',
			'}'
		];
		console.log(code.join("\n"));
		var Cashew = cashew.Cashew;
		var parsedAST = Cashew(code.join("\n"));
		var js = escodegen.generate(parsedAST);
		js = "(function(___JavaRuntime){" + js + "return MyClass.output();})(cashew.___JavaRuntime);";
		var out = eval(js);
		return buffer + out;
	}
} else {
	var Aether = require('../aether.js');
	var cashew = require('cashew-js');
	var evaluateJS = function (type, body, extra) {
		buffer = "";
		var a = new Aether({language: 'java'});
		cashew.___JavaRuntime.functions.print = function(what) {
			buffer += what + "\n";
		}
		var code = [
			'public class MyClass {',
			'	' + extra.join("\n\t"),
			'	public static ' + type + ' output() {',
			'		' + body.join("\n\t\t"),
			'	}',
			'}'
		];
		a.transpile(code.join("\n"));
		var fn = a.createFunction();
		var out = a.run();
		console.log(code.join("\n"), fn, out);
		console.log(a.problems);
		return buffer + out;
	}
}

function evaluateJava(type, body, extra) {
	var code = [
		'public class MyClass {',
		'	' + extra.join("\n\t"),
		'	public static ' + type + ' output() {',
		'		' + body.join("\n\t\t"),
		'	}',
		'	public static void main(String[] args) {',
		'		System.out.print(output());',
		'	}',
		'}'
	];
	if ( fs.existsSync('MyClass.java') ) fs.unlinkSync('MyClass.java');
	if ( fs.existsSync('MyClass.class') ) fs.unlinkSync('MyClass.class');
	fs.writeFileSync('MyClass.java', code.join("\n"));
	cp.execSync('javac MyClass.java');
	var out = cp.execSync('java MyClass');
	return out.toString();

	
}

function ct(desc, type, code, extra, expected) {
	if ( expected == undefined ) {
		expected = extra;
		extra = [];
	}

	it(desc, function() {
		if ( testTheTests ) {
			var test = evaluateJava(type, code, extra).toString();
		} else {
			var test = evaluateJS(type, code, extra).toString();
		}
		expect(test).not.toBeNull();
		expect(test).toEqual(expected);
		//console.log(desc, test,"\t",expected);
	});
}

function cts(type, code, expected) {
	ct(code, type, [code], expected);
}

function structureIf(cond, expected) {
	ct(cond, 'String', [
		'if (' + cond + ' ) return "Positive";',
		'return "Negitive";'
	], expected);
}

describe('05 - primative types', function() {
	cts('int', 'return 1000;', '1000');
	cts('String', 'return "Hello World";', 'Hello World');
	cts('boolean', 'return true;', 'true');
	cts('double', 'return 3.14159;', '3.14159');
});

describe('05 - assignment', function() {
	ct('int', 'int', ['int x = 10;', 'return x;'], '10')
	ct('String', 'String', ['String str = "Four score and seven years ago.";', 'return str;'], 'Four score and seven years ago.')
	ct('boolean', 'boolean', ['boolean truthyness = true;', 'return truthyness;'], 'true')
	ct('double', 'double', ['double roar = 17.76;', 'return roar;'], '17.76')
});

describe('05 - logical operators', function() {
	cts('boolean', 'return true && true;', 'true');
	cts('boolean', 'return true && false;', 'false');
	cts('boolean', 'return false && true;', 'false');
	cts('boolean', 'return false && false;', 'false');
	cts('boolean', 'return true || true;', 'true');
	cts('boolean', 'return true || false;', 'true');
	cts('boolean', 'return false || true;', 'true');
	cts('boolean', 'return false || false;', 'false');
});

describe('05 - math operators', function() {
	ct('addition', 'int', ['return 2+2;'], '4');
	ct('easy int division', 'int', ['return 6/2;'], '3');
	ct('round-down int division', 'int', ['return 5/2;'], '2');
	ct('double division', 'double', ['return 5.0/2;'], '2.5');

	cts('int', 'return 2+2*3;', '8');
	cts('int', 'return 7%3;', '1');
	cts('int', 'return -7%3;', '-1');
	cts('int', 'return -7%-3;', '-1');
	cts('int', 'return 7%-3;', '1');
});

describe('05 - string concatenation', function() {
	ct('simple', 'String', ['return "Hello" + " " + "World";'], 'Hello World');
});

describe('05 - if statements', function() {
	structureIf('true', 'Positive');
	structureIf('false', 'Negitive');
	structureIf('true && false', 'Negitive');
});

describe('05 - for loops', function() {
	ct('Add 0..5', 'int', [
		'int sum = 0;',
		'for ( int i = 0; i < 6; ++i ) {',
		'	sum += i;',
		'}',
		'return sum;'
	],"" + (1+2+3+4+5))

	ct('No init', 'int', [
		'int sum = 0;',
		'for ( ; sum < 123; sum = sum * 2 ) {',
		'	sum = sum + 1;',
		'}',
		'return sum;'
	],"126")

	ct('break', 'int', [
		'int sum = 0;',
		'for ( int i = 0; i < 10; ++i ) {',
		'	sum = sum + 1;',
		'	break;',
		'}',
		'return sum;'
	],"1")

});

describe('05 - while loops', function() {
	ct('Add 0..5', 'int', [
		'int sum = 0;',
		'int i = 0;',
		'while ( i < 6 ) {',
		'	sum += i;',
		'	i = i + 1;',
		'}',
		'return sum;'
	],"" + (1+2+3+4+5));

	ct('break', 'int', [
		'int sum = 0;',
		'int i = 1;',
		'while ( i < 6 ) {',
		'	sum += i;',
		'	i = i + 1;',
		'	break;',
		'}',
		'return sum;'
	],"1");

	ct('continue', 'int', [
		'int sum = 0;',
		'int i = 0;',
		'while ( i < 6 ) {',
		'	i = i + 1;',
		'	if ( i % 2 == 1 ) continue;',
		'	sum += i;',
		'}',
		'return sum;'
	],"" + (2+4+6));

});

describe('05 - SystemOut', function() {
	cts('boolean', 'System.out.println("Hello!"); return true;', "Hello!\ntrue");
	cts('boolean', 'System.out.println(10); return true;', "10\ntrue");
	cts('boolean', 'System.out.print("Hello!"); return true;', "Hello!true");
});

describe('07 - class definition', function() {


});

describe('07 - 2d arrays', function() {
	ct('simple', 'int', [
		'int[][] multi = new int[5][];',
		'multi[0] = new int[10];',
		'multi[1] = new int[10];',
		'multi[2] = new int[10];',
		'multi[3] = new int[10];',
		'multi[4] = new int[10];',
		'multi[1][4] = 3;',
		'return multi[1][4];'
	], "3");

	ct('initial matrix', 'String', [
		'int[][] multi = new int[][] {',
		'	{ 1, 0, 0, 0, 0, 0, 0, 0, 9, 0 },',
		'	{ 0, 2, 7, 0, 0, 0, 0, 8, 0, 0 },',
		'	{ 0, 0, 3, 0, 0, 0, 7, 0, 0, 0 },',
		'	{ 0, 0, 0, 4, 0, 6, 0, 0, 0, 0 },',
		'	{ 0, 0, 0, 0, 5, 0, 0, 0, 0, 0 }',
		'};',
		'return "-> " + multi[1][2] + " " + multi[4][4];'
	], '-> 7 5');

});

describe('07 - ternary operator', function() {
	cts('String', 'return true ? "A" : "B";', "A");
	cts('String', 'return false ? "A" : "B";', "B");
	cts('String', 'return 2+2 == 4 ? "A" : "B";', "A");
	cts('String', 'return 2+2 == 5 ? "A" : "B";', "B");
});

describe('07 - switch', function() {
	ct('basic switch', 'String', [
		'int x = 3;',
		'switch ( x ) {',
		'	case 1: return "No";',
		'	case 2: return "No";',
		'	case 3: return "Yes";',
		'	case 4: return "No";',
		'   default: return "No";',
		'}'
	], "Yes");

	ct('fall though switch', 'String', [
		'int x = 3;',
		'switch ( x ) {',
		'	case 1: ',
		'	case 2: return "No";',
		'	case 3: ',
		'	case 4: return "Yes";',
		'   default: return "No";',
		'}'
	], "Yes");

	ct('default switch', 'String', [
		'int x = 8;',
		'switch ( x ) {',
		'	case 1: return "No";',
		'	case 2: return "No";',
		'	case 3: return "No";',
		'	case 4: return "No";',
		'   default: return "Yes";',
		'}'
	], "Yes");

	ct('case into default switch', 'String', [
		'int x = 4;',
		'switch ( x ) {',
		'	case 1: ',
		'	case 2: ',
		'	case 3: return "No";',
		'	case 4:',
		'   default: return "Yes";',
		'}'
	], "Yes");

	ct('breaking switch', 'String', [
		'int x = 1;',
		'switch ( x ) {',
		'	case 1: ',
		'	case 2: ',
		'	case 3: break;',
		'	case 4:',
		'   default: return "No";',
		'}',
		'return "Yes";'
	], "Yes");

	ct('keep falling', 'String', [
		'int x = 2;',
		'switch ( x ) {',
		'	case 1: System.out.println("No");',
		'	case 2: System.out.println("A");',
		'	case 3: System.out.println("B");',
		'	case 4: System.out.println("C");',
		'   default: return "Yes";',
		'}'
	], "A\nB\nC\nYes");

});

describe('07 - complex assignment', function() {
	ct('+= (int)', 'int', ['int x = 7;','x += 2;','return x;'], '9');
	ct('-= (int)', 'int', ['int x = 7;','x -= 2;','return x;'], '5');
	ct('*= (int)', 'int', ['int x = 7;','x *= 2;','return x;'], '14');
	ct('/= (int)', 'int', ['int x = 7;','x /= 2;','return x;'], '3');	
	ct('%= (int)', 'int', ['int x = 7;','x %= 2;','return x;'], '1');	

	ct('+= (int v)', 'int', ['int x = 7;','int y = 5;', 'x += y;','return x;'], '12');
	ct('*= (int v)', 'int', ['int x = 7;','int y = 5;', 'x *= y;','return x;'], '35');
	ct('/= (int v)', 'int', ['int x = 7;','int y = 5;', 'x /= y;','return x;'], '1');
	ct('/= (d,i v)', 'double', ['double x = 7;','int y = 2;', 'x /= y;','return x;'], '3.5');

});


describe('07 - increment', function() {
	ct('++x (int)', 'int', ['int x = 7;','++x;','return x;'], '8');
	ct('--x (int)', 'int', ['int x = 7;','--x;','return x;'], '6');
	ct('x++ (int)', 'int', ['int x = 7;','x++;','return x;'], '8');
	ct('x-- (int)', 'int', ['int x = 7;','x--;','return x;'], '6');

	ct('++x (double)', 'double', ['double x = 7.5;','++x;','return x;'], '8.5');
	ct('--x (double)', 'double', ['double x = 7.5;','--x;','return x;'], '6.5');
	ct('x++ (double)', 'double', ['double x = 7.5;','x++;','return x;'], '8.5');
	ct('x-- (double)', 'double', ['double x = 7.5;','x--;','return x;'], '6.5');

});


describe('07 - bitwise operators', function() {
	cts('int', 'return 20<<3;', '160');
	cts('int', 'return 20>>3;', '2');
	cts('int', 'return -20<<3;', '-160');	
	cts('int', 'return 20<<-3;', '-2147483648');	
	cts('int', 'return 20>>-3;', '0');	
	cts('int', 'return ~20;', '-21');
});

describe('07 - complex if statements', function() {
	structureIf('2+2 == 4', 'Positive');
	structureIf('2+2 == 5', 'Negitive');
	structureIf('2+2 != 4', 'Negitive');
	structureIf('2+2 != 5', 'Positive');
});

describe('07 - braceless if', function() {
	ct('braceless', 'String',[
		'if ( 1 == 2 ) return "Wrong";',
		'else return "Right";'
	], 'Right')
});

describe('07 - instance/static variables', function() {
	var modifiers = ['public', 'private', ''];
	for ( var o in modifiers ) {
		var m = modifiers[o];
		ct(m + ' static int', 'int',[
			'return x;'
		],[
			m + ' static int x = 10;'
		], '10')
	}
	

});

describe('07 - static class method invocation', function() {
	ct('simple method', 'String', [
		'return getString();'
	],[
		'public static String getString() {',
		'	return "A String";',
		'}'
	], "A String");
});

