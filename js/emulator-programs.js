var BackEmulatorPrograms = {
	names: [
		'Hello world',
		'99 bottles'
	],

	programs: [
		'0 "Hello world!"\n\\:: putc $ ?(:put :end) ^^\n\\:: put .> putc\n\\:: end',
		'\\= CntL 6\n\\= CntH 7\n\nmain\n\n\\: & \\\\(a, b) (a&b)\n  0 ?? .\n' +
		'\\: | \\\\(a, b) (a|b)\n  =(0) 1 @(0) ?? .\n\\: ~ \\\\(a) (~a)\n  0 -1 ?? .\n' +
		'\\% drop \\\\(a) ()\n  0 = .\n\\: xor \\\\(a, b) (a xor b)\n  $ =(0) ~ @(0) ?? .\n\n' +
		'\\: + \\\\(a, b) (a + b)\n  3= $ 2= 3@ xor\n  &(2@ 3@) << $\n  ?(:+ :+_exit) ^^\n' +
		'  \\:: +_exit\n  $ =\n.\n\n' +
		'\\: ++ 1 + .\n\\: -- -1 + .\n\\: _ ~ ++ .\n\\: - _ + .\n\n' +
		'\\: print\n  $ ?(:print_put :print_end) ^^\n  \\:: print_put .> :print ^^\n' +
		'  \\:: print_end $ =\n.\n\n' +
		'\\: print-cnt\n  xor(@(CntH) "0") ?(:print-cnt_tens :print-cnt_check-zero) ^^\n' +
		'  \\:: print-cnt_tens @(CntH) .> print-cnt_ones\n' +
		'  \\:: print-cnt_check-zero xor(@(CntL) "0") ?(:print-cnt_ones :print-cnt_no) ^^\n' +
		'  \\:: print-cnt_no print(0 "no more bottles of beer") .\n' +
		'  \\:: print-cnt_ones @(CntL) $ .> print(0 " bottle")\n' +
		'  -- @(CntH) xor ?(:print-cnt_plural :print-cnt_end) ^^\n\n' +
		'  \\:: print-cnt_plural "s" .>\n  \\:: print-cnt_end print(0 " of beer")\n.\n\n' +
		'\\: dec-cnt\n  @(CntL) -- $ =(CntL) xor(47) ?(:dec-cnt_end :dec-cnt_borrow) ^^\n' +
		'  \\:: dec-cnt_borrow "9" =(CntL) @(CntH) -- =(CntH)\n  \\:: dec-cnt_end\n.\n\n' +
		'\\:: main\n\n"99" =(CntH) =(CntL)\n\n\\:: cycle\n' +
		'print-cnt print(0 " on the wall, ") print-cnt print(0 "Take one down and pass it around, " 10 ".")\n' +
		'dec-cnt\nprint-cnt print(0 10 " on the wall.")\n+(@(CntH) @(CntL)) 96 - ?(:cycle :end) ^^\n\n' +
		'\\:: end'
	],

	get: function (name) {
		return this.programs[this.names.indexOf(name)]
	}
}