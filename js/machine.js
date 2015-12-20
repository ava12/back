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
	this.isRunning = false
	this.callback = null
	this.context = null
	this.ticks = 0
}

BackMachineOpcodes = {
	hlt: 0,
	ret: 1,
	jmp: 2,
	call: 3,
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

BackMachine.prototype.updateBreakPointIndex = function () {
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

BackMachine.prototype.setBreakPoint = function (index, address) {
	index &= 15
	this.breakPoints[index] = address & 0xffff
	this.updateBreakPointIndex()
}

BackMachine.prototype.toggleBreakPoint = function (index, on) {
	index &= 15
	var flags = this.breakFlags
	var mask = 1 << index
	if (on != undefined) {
		var newFlags = (on ? flags | mask : flags & (~mask))
		if (newFlags != flags) this.breakFlags = newFlags
	}
	this.updateBreakPointIndex()
	return !!(flags & mask)
}

BackMachine.prototype.getMemory = function (address, length) {
	var result
	address &= 0xffff
	if (!length || length < 0) {
		result = this.memory[address]
		return (result ? result : 0)
	}

	result = new Array(length)
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
	address &= 65535
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
	this.status = BackMachineStatuses.manual
	this.events = 0
	this.eventAddress = null
	var opcode = this.program.charCodeAt(this.ip) & 15
	this.ip = (this.ip + 1) & 65535
	var operands = this.operandStack.length
	var calls = this.callStack.length
	var address, value, length, value0, mask

	switch (opcode) {
		case BackMachineOpcodes.hlt:
			this.status = BackMachineStatuses.halt
		break

		case BackMachineOpcodes.ret:
			if (calls) {
				this.ip = this.callStack.pop()
				this.events |= BackMachineEvents.callStack
			}
			else this.status = BackMachineStatuses.callStackEmpty
		break

		case BackMachineOpcodes.call:
			if (calls >= 255) {
				this.status = BackMachineStatuses.callStackFull
				break
			}
		case BackMachineOpcodes.jmp:
			if (!operands) this.status = BackMachineStatuses.operandStackEmpty
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
			if (!operands) this.status = BackMachineStatuses.operandStackEmpty
			else {
				address = this.operandStack.pop()
				this.operandStack.push(this.getMemory(address))
				this.events |= (BackMachineEvents.opStack | BackMachineEvents.read)
				this.eventAddress = address
			}
		break

		case BackMachineOpcodes.st:
			if (operands < 2) this.status = BackMachineStatuses.operandStackEmpty
			else {
				address = this.operandStack.pop()
				value = this.operandStack.pop()
				this.setMemory(address, value)
				this.events |= (BackMachineEvents.opStack | BackMachineEvents.write)
				this.eventAddress = address
			}
		break

		case BackMachineOpcodes.ins:
			if (operands >= 255) this.status = BackMachineStatuses.operandStackFull
			else {
				value = this.input.read()
				if (value == undefined) this.status = BackMachineStatuses.input
				else {
					this.operandStack.push(Number(value) || 0)
					this.events |= (BackMachineEvents.opStack | BackMachineEvents.input)
				}
			}
		break

		case BackMachineOpcodes.outs:
			if (!operands) this.status = BackMachineStatuses.operandStackEmpty
			else {
				value = this.operandStack.pop()
				if (this.output.write(value)) {
					this.events |= (BackMachineEvents.opStack | BackMachineEvents.output)
				} else {
					this.operandStack.push(value)
					this.status = BackMachineStatuses.output
				}
			}
		break

		case BackMachineOpcodes.shl:
		case BackMachineOpcodes.shr:
			if (!operands) this.status = BackMachineStatuses.operandStackEmpty
			else {
				value = this.operandStack.pop()
				value = (opcode == BackMachineOpcodes.shl ? value << 1 : value >> 1) & 0xffff
				this.operandStack.push(value)
				this.events |= BackMachineEvents.opStack
			}
		break

		case BackMachineOpcodes.test:
		case BackMachineOpcodes.bt:
			if (operands < 3) this.status = BackMachineStatuses.operandStackEmpty
			else {
				value0 = this.operandStack.pop()
				value = this.operandStack.pop()
				mask = this.operandStack.pop()
				if (opcode == BackMachineOpcodes.test) value = (mask ? value : value0)
				else value = (value & mask) | (value0 & (~mask))
				this.operandStack.push(value & 0xffff)
				this.events |= BackMachineEvents.opStack
			}
		break

		case BackMachineOpcodes.dn:
		case BackMachineOpcodes.db:
		case BackMachineOpcodes.dw:
			if (operands >= 255) {
				this.status = BackMachineStatuses.operandStackFull
				break
			}

			length = 1 << (opcode & 3)
			value = 0
			for (var i = 0; i < length; i++) {
				value = (value << 4) | (this.program.charCodeAt(this.ip) & 15)
				this.ip = (this.ip + 1) & 0xffff
			}
			length <<= 2
			mask = 1 << (length - 1)
			if (value & mask) value |= (~mask + 1 - mask)
			this.operandStack.push(value)
			this.events |= BackMachineEvents.opStack
		break

		case BackMachineOpcodes.dup:
			if (operands >= 255) this.status = BackMachineStatuses.operandStackFull
			else if (!operands) this.status = BackMachineStatuses.operandStackEmpty
			else {
				this.operandStack.push(this.operandStack[operands - 1])
				this.events |= BackMachineEvents.opStack
			}
		break
	}

	if (this.status < BackMachineStatuses.breakPoint) {
		if (this.status == BackMachineStatuses.manual && this.ip in this.breakPointIndex) {
			this.status = BackMachineStatuses.breakPoint
		}
	} else {
		this.ip = (this.ip - 1) & 0xffff
	}
	this.ticks++
	return this.status
}

BackMachine.prototype.tick = function (batchSize) {
	if (!this.isRunning) return

	for (var batch = batchSize; batch > 0; batch--) {
		this.step()
		if (!this.status == BackMachineStatuses.manual) {
			this.isRunning = false
			if (this.callback) {
				this.callback.call(this.context, this.status, this)
			}
			return
		}
	}

	var t = this
	setTimeout(function () {
		t.tick(batchSize)
	}, 0)
}

BackMachine.prototype.run = function (callback, context, batchSize) {
	if (!batchSize) batchSize = 1
	if (callback) {
		this.callback = callback
		this.context = context
	}
	this.isRunning = true
	var t = this
	setTimeout(function () {
		t.tick(batchSize)
	}, 0)
}

BackMachine.prototype.stop = function () {
	this.isRunning = false
}

BackMachine.prototype.reset = function () {
	this.isRunning = false
	this.ip = 0
	this.memory = {}
	this.callStack = []
	this.operandStack = []
}

BackMachine.prototype.getBreakIndex = function (address) {
	var result = this.breakPointIndex[address]
	if (result != undefined && (this.breakFlags & (1 << result))) return result
	else return null
}