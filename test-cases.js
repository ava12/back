var BackTestCases = [
	{	name: 'все машинные коды',
		source: '!! . ^ ^^ @ = .< .> << >> ? ?? 1 8 128 $',
		ip: 1,
		status: BackMachineStatuses.halt,
		code: '0123456789jkl1m08n0080o'},

	{	name: 'числа',
		source: '7 -8 8 -9 127 -128 128 -129',
		ip: 27,
		code: 'l7l8m08mo7m7om80n0080noo7o',
		operands: [7, -8, 8, -9, 127, -128, 128, -129]},

	{	name: 'пустой стек операндов',
		source: '@',
		ip: 0,
		status: BackMachineStatuses.operandStackEmpty},

	{	name: 'пустой стек вызовов',
		source: '.',
		ip: 0,
		status: BackMachineStatuses.callStackEmpty},


	{	name: 'переполнение стека операндов',
		source: '0 0 ^^',
		ip: 2,
		status: BackMachineStatuses.operandStackFull},

	{	name: 'переполнение стека вызовов',
		source: '0 ^',
		ip: 2,
		status: BackMachineStatuses.callStackFull},

	{	name: 'побитовый выбор',
		source: '?? (0xf0 (0xaa 0xcc))',
		ip: 17,
		operands: [0xca]},

	{	name: 'ввод/вывод',
		source: '20 13 .< $ 0 = ? ^^ 0 @ .> 0 ^^ .<',
		input: 'привет',
		ip: 20,
		status: BackMachineStatuses.input,
		output: 'привет'}
]