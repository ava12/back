var BackEmulatorPrograms = {
	names: [
		'Hello world',
		'99 bottles'
	],

	programs: [
		'0 "Hello world!"\n\\:: putc $ ?(:put :end) ^^\n\\:: put .> putc\n\\:: end',

		'\\= CntL 6\n\\= CntH 7\n\nmain\n\n\\: & \\\\(a, b) (a&b)\n  0 ?? .\n' +
		'\\: | \\\\(a, b) (a|b)\n  =(0) -1 @(0) ?? .\n\\: ~ \\\\(a) (~a)\n  0 -1 ?? .\n' +
		'\\% drop \\\\(a) ()\n  0 = .\n\\: xor \\\\(a, b) (a xor b)\n  $ =(0) ~ @(0) ?? .\n\n' +
		'\\: + \\\\(a, b) (a + b)\n  3= $ 2= 3@ xor\n  &(2@ 3@) << $\n  ?(:+ :+_exit) ^^\n' +
		'  \\:: +_exit\n  $ =\n.\n\n\\: ++ 1 + .\n\\: -- -1 + .\n\\: _ ~ ++ .\n\\: - _ + .\n\n' +
		'\\: print\n\\{\n  $ ?(:_put :_end) ^^\n  \\:: _put .> :print ^^\n  \\:: _end $ =\n\\} .\n\n' +
		'\\: print-cnt\n\\{\n  xor(@(CntH) "0") ?(:_tens :_check-zero) ^^\n  ' +
		'\\:: _tens @(CntH) .> _ones\n  \\:: _check-zero xor(@(CntL) "0") ?(:_ones :_no) ^^\n' +
		'  \\:: _no print(0 "no more bottles of beer") .\n  ' +
		'\\:: _ones @(CntL) $ .> print(0 " bottle")\n  -- @(CntH) xor ?(:_plural :_end) ^^\n\n' +
		'  \\:: _plural "s" .>\n  \\:: _end print(0 " of beer")\n\\} .\n\n\\: dec-cnt\n' +
		'\\{\n  @(CntL) -- $ =(CntL) xor(47) ?(:_end :_borrow) ^^\n' +
		'  \\:: _borrow "9" =(CntL) @(CntH) -- =(CntH)\n  \\:: _end\n\\} .\n\n\\:: main\n\n' +
		'"99" =(CntH) =(CntL)\n\n\\:: cycle\n' +
		'print-cnt print(0 " on the wall, ") print-cnt print(0 "Take one down and pass it around, " 10 ".")\n' +
		'dec-cnt\nprint-cnt print(0 10 " on the wall.")\n' +
		'+(@(CntH) @(CntL)) 96 - ?(:cycle :end) ^^\n\n\\:: end'
	],

	get: function (name) {
		return this.programs[this.names.indexOf(name)]
	}
}