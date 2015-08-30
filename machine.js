function BackMachine(input, output, program) {
	this.status = this.statuses.manual
	this.setInput(input)
	this.setOutput(output)
	this.memory = {}
	this.program = this.setProgram(0, program)
	this.ip = 0
	this.callStack = []
	this.operandStack = []
	this.breakPoints = new Array(16)
	for (var i = 0; i < 16; i++) this.breakPoints[i] = 0
	this.breakFlags = 0
	this.breakPointIndex = {}
}

BackMachineOpcodes = {
	hlt: 0,
	ret: 1,
	call: 2,
	jmp: 3,
	ld: 4,
	st: 5,
	ins: 6,
	outs: 7,
	shl: 8,
	shr: 9,
	test: 10,
	bt: 11,
	dn: 12,
	db: 13,
	dw: 14,
	dup: 15
}

BackMachineStatuses = {
	manual: 0,
	halt: 1,

	breakPoint: 3,
	input: 4,
	output: 5,
	operandStackEmpty: 6,
	operandStackFull: 7,
	callStackEmpty: 8,
	callStackFull: 9
}

BackMachine.prototype.nullIo = {
	read: function () {},
	write: function () {}
}

BackMachine.prototype.getBreakPoint = function (index) {
	return this.breakPoints[index & 15]
}

BackMachine.prototype.setBreakPoint = function (index, address) {
	index &= 15
	this.breakPoints[index] = address & 0xffff
	this.breakPointIndex = {}
	if (this.breakFlags) {
		var flags = this.breakFlags
		var mask = 1
		for (index = 0; index < 16; index++) {
			if (flags & mask) {
				address = this.breakPoints[index]
				if (this.breakPointIndex[address] == undefined) {
					this.breakPointIndex[address] = index
				}
			}
			mask <<= 1
		}
	}
}

BackMachine.prototype.toggleBreakPoint = function (index, on) {
	index &= 15
	var flags = this.breakFlags
	var mask = 1 << index
	if (on != undefined) {
		var newFlags = (on ? flags | mask : flags & (~mask))
		if (newFlags != flags) this.breakFlags = newFlags
	}
	return !!(flags & mask)
}

BackMachine.prototype.getMemory = function (address, length) {
	var result
	if (!length || lenght < 0) {
		result = this.memory[address]
		return (result ? result : 0)
	}

	result = new Array(length)
	address &= 0xffff
	for (var i = 0; i < length; i++) {
		var word = this.memory[address]
		result[i] = (word ? word : 0)
		address = (address + 1) & 0xffff
	}

	return result
}

BackMachine.prototype.setMemory = function (address, values) {
	address &= 0xffff
	if (!(values instanceof Array)) values = [values]
	for (var i = 0; i < values.length; i++) {
		var value = Number(values[i])
		if (value) this.memory[address] = value
		else delete this.memory[address]
		address = (address + 1) & 0xffff
	}
}

BackMachine.prototype.getProgram = function (address, length) {
	var result = this.program.substr(address, length)
	if (result.length < length) result += (new Array(length - result.length + 1)).join('0')
	return result
}

BackMachine.prototype.setProgram = function (address, program) {
	address &= 0xffff
	if (program instanceof Array) {
		for (var i = 0; i < program.length; i++) {
			var ch = program[i]
			if (typeof ch == 'number') program[i] = String.fromCharCode(ch & 0xffff)
		}
		program = program.join('')
	}

	if ((program.length + address) > 0x10000) program = program.substr(0, 0x10000 - address)
	if (this.program.length < address) {
		this.program += (new Array(address - this.program.length + 1)).join('0')
	}
	this.program = this.program.substr(0, address) + program + this.program.substr(address + program.length)
}

BackMachine.prototype.setInput = function (input) {
	this.input = (input ? input : this.nullIo)
}

BackMachine.prototype.setOutput = function (output) {
	this.output = (output ? output : this.nullIo)
}

BackMachine.prototype.step = function () {
	this.status = this.statuses.manual
	var opcode = this.program.charCodeAt(this.ip) & 15
	var operands = this.operandStack.length
	var calls = this.callStack.length
	var address, value, length, value2, mask

	switch (opcode) {
		case this.opcodes.hlt:
			this.status = this.statuses.halt
		break

		case this.opcodes.ret:
			if (calls) this.ip = this.callStack.pop()
			else this.status = this.statuses.callStackEmpty
		break

		case this.opcodes.call:
			if (calls >= 255) {
				this.status = this.statuses.callStackFull
				break
			}
		case this.opcodes.jmp:
			if (!operands) this.status = this.statuses.operandStackEmpty
			else this.ip = this.operandStack.pop()
		break


		case this.opcodes.ld:
			if (!operands) this.status = this.statuses.operandStackEmpty
			else this.operandStack.push(this.getMemory(this.operandStack.pop()))
		break

		case this.opcodes.st:
			if (operands < 2) this.status = this.statuses.operandStackEmpty
			else {
				address = this.operandStack.pop()
				value = this.operandStack.pop()
				this.setMemory(address, value)
			}
		break

		case this.opcodes.ins:
			if (operands >= 255) this.status = this.statuses.operandStackFull
			else {
				value = this.input.read()
				if (value == undefined) this.status = this.statuses.input
				else this.operandStack.push(Number(value) || 0)
			}
		break

		case this.opcodes.outs:
			if (!operands) this.status = this.statuses.operandStackEmpty
			else {
				value = this.operandStack.pop()
				if (!this.output.write(value)) {
					this.operandStack.push(value)
					this.status = this.statuses.output
				}
			}
		break

		case this.opcodes.shl:
		case this.opcodes.shr:
			if (!operands) this.status = this.statuses.operandStackEmpty
			else {
				value = this.operandStack.pop()
				value = (opcode == this.opcodes.shl ? value << 1 : value >> 1) & 0xffff
				this.operandStack.push(value)
			}
		break

		case this.opcodes.test:
		case this.opcodes.bt:
			if (operands < 3) this.status = this.statuses.operandStackEmpty
			else {
				mask = this.operandStack.pop()
				value2 = this.operandStack.pop()
				value = this.operandStack.pop()
				if (operand == this.operands.test) value = (mask ? value2 : value)
				else value = (value2 & mask) | (value & (~mask))
				this.operandStack.push(value)
			}
		break

		case this.opcodes.dn:
		case this.opcodes.db:
		case this.opcodes.dw:
			if (operands >= 255) {
				this.status = this.statuses.operandStackFull
				break
			}

			length = 1 << (opcode & 3)
			value = 0
			for (var i = 0; i < length; i++) {
				this.ip = (this.ip + 1) & 0xffff
				value = (value << 4) | (this.program.charCodeAt(this.ip) & 15)
			}
			length <<= 2
			mask = 1 << (length - 1)
			if (value & mask) value |= (~mask + 1 - mask)
			this.operandStack.push(value)
		break

		case this.opcodes.dup:
			if (opcodes >= 255) this.status = this.statuses.operandStackFull
			else this.operandStack.push(opcodes ? this.operandStack[opcodes - 1] : 0)
		break
	}

	if (this.status < this.statuses.breakPoint) {
		this.ip = (this.ip + 1) & 0xffff
		if (this.status == this.statuses.manual && this.ip in this.breakPointIndex) {
			this.status = this.statuses.breakPoint
		}
	}
	return this.status
}