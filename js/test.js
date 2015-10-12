function BackTestIo(input) {
	this.input = (input ? input : '')
	this.output = ''
	this.pos = 0
}

BackTestIo.prototype.read = function () {
	if (this.pos > this.input.length) return null

	this.pos++
	if (this.pos == this.input.length + 1) return 0

	return this.input.charCodeAt(this.pos - 1)
}

BackTestIo.prototype.write = function (value) {
	this.output += String.fromCharCode(value)
	return true
}


var BackTest = {
	run: function (cases) {
		for (var i in cases) {
			var errors = this.runCase(cases[i])
			if (errors.length) return {index: i, name: cases[i].name, errors: errors}
		}

		return null
	},

	compareArrays: function (a, b) {
		if (a.length != b.length) return false

		for (var i = a.length - 1; i >= 0; i--) if (a[i] != b[i]) return false

		return true
	},

	hexArray: function(a) {
		var result = new Array(a.length)
		for (var i = 0; i < a.length; i++) result[i] = a[i].toString(16)
		return result.join(',')
	},

	runCase: function (testCase, stop) {
		var result = []
		try {
			var io = new BackTestIo(testCase.input)
			var program = (new BackParser(testCase.source)).parse()
			var machine = new BackMachine(io, io, program.code)
			for (var i in program.breakPoints) {
				machine.setBreakPoint(i, program.breakPoints[i])
				machine.toggleBreakPoint(i, true)
			}

			if (stop) {
				var name = '' // место для бряка
			}

			while (!machine.status) machine.step()

			for (name in testCase) {
				var expected = testCase[name]
				var got, i, j

				switch (name) {
					case 'ip':
						if (machine.ip != expected) {
							result.push('IP: ожидается ' + expected + ', получено ' + machine.ip)
						}
					break

					case 'status':
						if (machine.status != expected) {
							result.push('статус: ожидается ' + expected + ', получено ' + machine.ip)
						}
					break

					case 'code':
						got = machine.getProgram(0, expected.length)
						for (i = got.length - 1; i >= 0; i--) {
							if ((got.charCodeAt(i) ^ expected.charCodeAt(i)) & 15) {
								result.push('код: вместо ' + expected + '\r\n   получено ' + got)
								break
							}
						}
					break

					case 'ram':
						for (i in expected) {
							got = machine.getMemory(i, expected[i].length)
							for (j = 0; j < got.length; j++) {
								if (got[j] != expected[i][j]) {
									result.push('адрес ' + Number(i).toString(16) + ': ' + got[j].toString(16) +
										' вместо ' + expected[i][j].toString(16))
								}
							}
						}
					break

					case 'output':
						got = io.output
						if (got != expected) {
							result.push('вывод: вместо "' + expected + '" получено "' + got + '"')
						}
					break

					case 'operands':
					case 'calls':
						var isOp = (name == 'operands')
						got = (isOp ? machine.operandStack : machine.callStack)
						if (!this.compareArrays(got, expected)) {
							result.push((isOp ? 'операнды' : 'вызовы') + ': вместо [' +
								this.hexArray(expected) + '] получено [' + this.hexArray(got) + ']')
						}
					break
				}
			}

		} catch (e) {
			console.log(e)
			return [e.message]
		}

		if (stop) {
			name = '' // место для бряка
		}
		return result
	},
}