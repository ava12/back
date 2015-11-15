function BackEmulator()  {
	this.dom = {}
	this.stateDom = []
	this.io = new BackEmulatorIo(this.dom.output)
	this.machine = null
	this.address = 0
	this.debug = null

	var items = {
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
		debug: 'debug',
		dialog: 'dialog',
		loadBuiltin: 'load-builtin',
		loadList: 'load-list'
	}
	for (var i in items) {
		this.dom[i] = document.getElementById(items[i])
	}

	items = ['ip', 'cpu', 'ops', 'calls', 'ram']
	for (i in items) this.stateDom[i] = this.dom[items[i]]

	items = []
	for (i = 0; i < BackEmulatorPrograms.names.length; i++) {
		items.push('<li><a>' + this.escape(BackEmulatorPrograms.names[i]) + '</a></li>')
	}
	this.dom.loadBuiltin.innerHTML = items.join('\r\n')
	items = this.dom.loadBuiltin.childNodes
	var t = this
	var handler = function () {
		t.loadBuiltin(t.unescape(this.innerHTML))
	}
	for (i = 0; i < items.length; i++) items[i].childNodes[0].onclick = handler
	items = null

	document.body.onkeypress = function (event) {
		return t.onKeyPress(event)
	}
}

BackEmulator.prototype.messages = {
	4: 'ожидание готовности ввода',
	5: 'ожидание готовности вывода',
	6: 'стек операндов пуст',
	7: 'стек операндов переполнен',
	8: 'стек возврата пуст',
	9: 'стек возврата переполнен'
}

BackEmulator.prototype.escape = function (text) {
	return text.
		replace('&', '&amp;').
		replace('<', '&lt;').
		replace('>', '&gt;').
		replace('"', '&quot;')
}

BackEmulator.prototype.unescape = function (html) {
	return html.
		replace('&quot;', '"').
		replace('&gt;', '>').
		replace('&lt;', '<').
		replace('&amp;', '&')
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

BackEmulator.prototype.showSource = function () {
	if (this.machine.isRunning) this.machine.stop()
	this.dom.debugFrame.setAttribute('class', 'hidden')
	this.dom.sourceFrame.setAttribute('class', '')
	this.debug = null
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
	this.io.dump()
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

BackEmulator.prototype.stepOut = function () {
	this.hideMachineState()
	this.debug.stepOut()
}

BackEmulator.prototype.stepIn = function () {
	this.hideMachineState()
	this.debug.stepIn()
}

BackEmulator.prototype.stepOver = function () {
	this.hideMachineState()
	this.debug.stepOver()
}

BackEmulator.prototype.onKeyPress = function (event) {
	if (!this.debug || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return true

	switch (event.key) {
		case '6': this.stepOut(); break
		case '7': this.stepIn(); break
		case '8': this.stepOver(); break
		case '9': this.run(); break
		case '0': this.reset(); break
		default: return true
	}
	return false
}

BackEmulator.prototype.refreshProgramList = function () {
	var names = BackEmulatorStorage.listNames()
	var items = []
	for (var i = 0; i < names.length; i++) {
		items.push('<li><a>' + this.escape(names[i]) + '</a>' +
			'<input type="button" value="Сохранить"><input type="button" value="Удалить">')
	}
	this.dom.loadList.innerHTML = items.join('\r\n')

	var t = this

	var loadHandler = function () {
		t.loadProgram(t.unescape(this.innerHTML))
	}

	var saveHandler = function () {
		t.saveProgram(t.unescape(this.parentNode.childNodes[0].innerHTML))
	}

	var deleteHandler = function () {
		t.deleteProgram(t.unescape(this.parentNode.childNodes[0].innerHTML))
	}

	items = this.dom.loadList.childNodes
	for (i = 0; i < items.length; i++) {
		var children = items[i].childNodes
		children[0].onclick = loadHandler
		children[1].onclick = saveHandler
		children[2].onclick = deleteHandler
	}
}

BackEmulator.prototype.showProgramDialog = function () {
	if (BackEmulatorStorage.available) this.refreshProgramList()
	this.dom.dialog.setAttribute('class', '')
}

BackEmulator.prototype.closeProgramDialog = function () {
	this.dom.dialog.setAttribute('class', 'hidden')
}

BackEmulator.prototype.loadBuiltin = function (name) {
	this.dom.source.value = BackEmulatorPrograms.get(name)
	this.closeProgramDialog()
}

BackEmulator.prototype.loadProgram = function (name) {
}

BackEmulator.prototype.saveProgram = function (name) {
}

BackEmulator.prototype.deleteProgram = function (name) {
}
