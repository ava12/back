function BackMachine(input, output, program) {
	this.status = BackMachineStatuses.manual
	this.setInput(input)
	this.setOutput(output)
	this.memory = {}
	this.program = ''
	this.setProgram(0, program)
	this.ip = 0
	this.callStack = []
	this.operandStack = []
	this.breakPoints = new Array(16)
	for (var i = 0; i < 16; i++) this.breakPoints[i] = 0
	this.breakFlags = 0
	this.breakPointIndex = {}
	this.events = 0
	this.eventAddress = null
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

BackMachineEvents = {
	read: 1,
	write: 2,
	input: 4,
	output: 8,
	opStack: 16,
	callStack: 32
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
	if (!length || length < 0) {
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
	var nextAddr = address + length
	if (nextAddr > 65536) return (
		this.getProgram(address, 65536 - address) +
		this.getProgram(0, nextAddr - 65536)
	)

	var result = this.program.substr(address, length)
	if (result.length < length) result += (new Array(length - result.length + 1)).join('0')
	return result
}

BackMachine.prototype.setProgram = function (address, program) {
	if (!program) return

	address &= 0xffff
	if (program instanceof Array) {
		for (var i = 0; i < program.length; i++) {
			var ch = program[i]
			if (typeof ch == 'number') program[i] = String.fromCharCode(ch & 0xffff)
		}
		program = program.join('')
	}

	if ((program.length + address) > 65536) {
		this.setProgram(address, program.substr(0, 65536 - address))
		this.setProgram(0, program.substr(65536 - address))
		return
	}

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
	this.events = 0
	this.eventAddress = null
	var opcode = this.program.charCodeAt(this.ip) & 15
	var operands = this.operandStack.length
	var calls = this.callStack.length
	var address, value, length, value2, mask

	switch (opcode) {
		case BackMachineOpcodes.hlt:
			this.status = this.statuses.halt
		break

		case BackMachineOpcodes.ret:
			if (calls) {
				this.ip = this.callStack.pop()
				this.events |= BackMachineEvents.callStack
			}
			else this.status = this.statuses.callStackEmpty
		break

		case BackMachineOpcodes.call:
			if (calls >= 255) {
				this.status = this.statuses.callStackFull
				break
			}
		case BackMachineOpcodes.jmp:
			if (!operands) this.status = this.statuses.operandStackEmpty
			else {
				if (opcode == BackMachineOpcodes.call) {
					this.callStack.push(this.ip)
					this.events |= BackMachineEvents.callStack
				}
				this.ip = this.operandStack.pop()
				this.events |= BackMachineEvents.opStack
			}
		break


		case BackMachineOpcodes.ld:
			if (!operands) this.status = this.statuses.operandStackEmpty
			else {
				address = this.operandStack.pop()
				this.operandStack.push(this.getMemory(address))
				this.events |= (BackMachineEvents.opStack | BackMachineEvents.read)
				this.eventAddress = address
			}
		break

		case BackMachineOpcodes.st:
			if (operands < 2) this.status = this.statuses.operandStackEmpty
			else {
				address = this.operandStack.pop()
				value = this.operandStack.pop()
				this.setMemory(address, value)
				this.events |= (BackMachineEvents.opStack | BackMachineEvents.write)
				this.eventAddress = address
			}
		break

		case BackMachineOpcodes.ins:
			if (operands >= 255) this.status = this.statuses.operandStackFull
			else {
				value = this.input.read()
				if (value == undefined) this.status = this.statuses.input
				else {
					this.operandStack.push(Number(value) || 0)
					this.events |= (BackMachineEvents.opStack | BackMachineEvents.input)
				}
			}
		break

		case BackMachineOpcodes.outs:
			if (!operands) this.status = this.statuses.operandStackEmpty
			else {
				value = this.operandStack.pop()
				if (this.output.write(value)) {
					this.events |= (BackMachineEvents.opStack | BackMachineEvents.output)
				} else {
					this.operandStack.push(value)
					this.status = this.statuses.output
				}
			}
		break

		case BackMachineOpcodes.shl:
		case BackMachineOpcodes.shr:
			if (!operands) this.status = this.statuses.operandStackEmpty
			else {
				value = this.operandStack.pop()
				value = (opcode == BackMachineOpcodes.shl ? value << 1 : value >> 1) & 0xffff
				this.operandStack.push(value)
				this.events |= BackMachineEvents.opStack
			}
		break

		case BackMachineOpcodes.test:
		case BackMachineOpcodes.bt:
			if (operands < 3) this.status = this.statuses.operandStackEmpty
			else {
				mask = this.operandStack.pop()
				value2 = this.operandStack.pop()
				value = this.operandStack.pop()
				if (operand == this.operands.test) value = (mask ? value2 : value)
				else value = (value2 & mask) | (value & (~mask))
				this.operandStack.push(value)
				this.events |= BackMachineEvents.opStack
			}
		break

		case BackMachineOpcodes.dn:
		case BackMachineOpcodes.db:
		case BackMachineOpcodes.dw:
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
			this.events |= BackMachineEvents.opStack
		break

		case BackMachineOpcodes.dup:
			if (opcodes >= 255) this.status = this.statuses.operandStackFull
			else {
				this.operandStack.push(opcodes ? this.operandStack[opcodes - 1] : 0)
				this.events |= BackMachineEvents.opStack
			}
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