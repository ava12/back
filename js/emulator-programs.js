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
		'\\: + \\\\(a, b) (a + b)\n  3= $ 2= 3@ xor\n  &(2@ 3@) << $\n  ?(:+ :+:exit) ^^\n' +
		'  \\:: +:exit\n  $ =\n.\n\n' +
		'\\: ++ 1 + .\n\\: -- -1 + .\n\\: _ ~ ++ .\n\\: - _ + .\n\\% cmp - .\n\n' +
		'\\: print\n  $ ?(:print:put :print:end) ^^\n  \\:: print:put .> :print ^^\n' +
		'  \\:: print:end drop .\n\n' +
		'\\: print-cnt\n  cmp(@(:CntH) "0") ?(:print-cnt:tens :print-cnt:check-zero) ^^\n' +
		'  \\:: print-cnt:tens @(:CntH) .> :print-cnt:ones ^^\n' +
		'  \\:: print-cnt:check-zero cmp(@(:CntL) "0") ?(:print-cnt:ones :print-cnt:no) ^^\n' +
		'  \\:: print-cnt:no print(0 "no more bottles of beer") .\n' +
		'  \\:: print-cnt:ones @(:CntL) $ .> print(0 " bottle")\n' +
		'  -- @(:CntH) xor ?(:print-cnt:plural :print-cnt:end) ^^\n\n' +
		'  \\:: print-cnt:plural "s" .>\n  \\:: print-cnt:end print(0 " of beer")\n.\n\n' +
		'\\: dec-cnt\n  @(:CntL) -- $ =(:CntL) cmp(47) ?(:dec-cnt:end :dec-cnt:borrow) ^^\n' +
		'  \\:: dec-cnt:borrow "9" =(:CntL) @(:CntH) -- =(:CntH)\n  \\:: dec-cnt:end\n.\n\n' +
		'\\:: main\n\n"99" =(:CntH) =(:CntL)\n\n\\:: cycle\n' +
		'print-cnt print(0 " on the wall, ") print-cnt print(0 "Take one down and pass it around, " 10 ".")\n' +
		'dec-cnt\nprint-cnt print(0 10 " on the wall.")\n+(@(:CntH) @(:CntL)) 96 - ?(:cycle :end) ^^\n\n' +
		'\\:: end'
	],

	get: function (name) {
		return this.programs[this.names.indexOf(name)]
	}
}