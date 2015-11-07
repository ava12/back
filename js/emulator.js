function BackEmulator()  {
	this.dom = {}
	var dom = {
		input: 'input',
		output: 'output',
		ip: 'ip',
		cpu: 'cpu',
		ops: 'ops',
		calls: 'calls',
		address: 'address',
		ram: 'ram',
		sourceFrame: 'source-frame',
		sourceName: 'source-name',
		source: 'source',
		debugFrame: 'debug-frame',
		debugContainer: 'debug-container',
		debug: 'debug'
	}
	for (var i in dom) {
		this.dom[i] = document.getElementById(dom[i])
	}
	dom = ['ip', 'cpu', 'ops', 'calls', 'ram']
	this.stateDom = []
	for (i in dom) this.stateDom[i] = this.dom[dom[i]]

	this.io = new BackEmulatorIo(this.dom.output)
	this.machine = null
	this.address = 0
	this.debug = null
}

BackEmulator.prototype.messages = {
	4: 'ожидание готовности ввода',
	5: 'ожидание готовности вывода',
	6: 'стек операндов пуст',
	7: 'стек операндов переполнен',
	8: 'стек возврата пуст',
	9: 'стек возврата переполнен'
}

BackEmulator.prototype.hex = function (value) {
	return ('000' + value.toString(16)).substr(-4)
}

BackEmulator.prototype.updateInput = function () {
	this.io.setInput(this.dom.input.value)
}

BackEmulator.prototype.selectAddress = function () {
	var newAddress = prompt('Новый адрес памяти:', '0x' + this.hex(this.address))
	if (!newAddress) return

	this.address = parseInt(newAddress) & 65535
	this.dom.address.value = this.hex(this.address)
	this.dumpRam()
}

BackEmulator.prototype.dumpRam = function () {
	var dump = this.machine.getMemory(this.address, 16)
	for (var i in dump) dump[i] = this.hex(dump[i])
	this.dom.ram.innerHTML = dump.join('<br>\r\n')
}

BackEmulator.prototype.dumpStack = function (dom, stack) {
	var len = stack.length - 1
	if (len < 0) {
		dom.innerHTML = ''
		return
	}

	var reversed = new Array(len + 1)
	for (var i = len >> 1; i >= 0; i--) {
		reversed[i] = this.hex(stack[len - i])
		reversed[len - i] = this.hex(stack[i])
	}
	dom.innerHTML = reversed.join('<br>\r\n')
}

BackEmulator.prototype.dumpCpu = function () {
	this.dom.ip.innerHTML = this.hex(this.machine.ip)
	var code = this.machine.getProgram(this.machine.ip - 16, 33)
	var hex = new Array(33)
	for (var i = 0; i < 33; i++) {
		hex[i] = (code.charCodeAt(i) & 15).toString(16)
	}
	hex.splice(17, 0, '-')
	hex.splice(16, 0, '-')
	this.dom.cpu.innerHTML = hex.join('')
}

BackEmulator.prototype.showMachineState = function () {
	this.dumpCpu()
	this.dumpRam()
	this.dumpStack(this.dom.ops, this.machine.operandStack)
	this.dumpStack(this.dom.calls, this.machine.callStack)
}

BackEmulator.prototype.hideMachineState = function () {
	for (var i in this.stateDom) this.stateDom[i].innerHTML = ''
}

BackEmulator.prototype.saveSource = function () { alert('Еще не реализовано') }
BackEmulator.prototype.loadSource = function () { alert('Еще не реализовано') }

BackEmulator.prototype.showSource = function () {
	if (this.machine.isRunning) this.machine.stop()
	this.dom.debugFrame.setAttribute('class', 'hidden')
	this.dom.sourceFrame.setAttribute('class', '')
}

BackEmulator.prototype.showDebug = function () {
	var source = this.dom.source.value
	this.machine = new BackMachine(this.io, this.io)

	try {
		this.debug = new BackEmulatorDebug(this.machine, source,
			this.dom.debugContainer, this.dom.debug, this.callback, this)
	} catch (e) {
		alert(e.message)
		return
	}

	this.dom.sourceFrame.setAttribute('class', 'hidden')
	this.dom.debugFrame.setAttribute('class', '')
	this.io.reset(this.dom.input.value)
	this.showMachineState()
}

BackEmulator.prototype.callback = function () {
	this.showMachineState()
	var message = this.messages[this.machine.status]
	if (message) alert(message)
}

BackEmulator.prototype.run = function () {
	if (this.debug.isRunning) this.debug.stop()
	else {
		this.hideMachineState()
		this.debug.run()
	}
}

BackEmulator.prototype.reset = function () {
	if (this.debug.isRunning) return

	this.debug.reset()
	this.io.reset(this.dom.input.value)
	this.showMachineState()
}
