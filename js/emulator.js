function BackEmulator()  {
	this.dom = {}
	this.stateDom = []
	this.io = null
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
	this.dom.loadBuiltin.innerHTML = items.join('')
	items = this.dom.loadBuiltin.childNodes
	var t = this
	var handler = function () {
		t.loadBuiltin(t.unescape(this.innerHTML))
	}
	for (i = 0; i < items.length; i++) items[i].childNodes[0].onclick = handler
	items = null

	this.io = new BackEmulatorIo(this.dom.output)

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
	return ('000' + (value & 65535).toString(16)).substr(-4)
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
	this.dumpStack(this.dom.ops, this.machine.operandStack.slice(-16))
	this.dumpStack(this.dom.calls, this.machine.callStack.slice(-16))
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
		this.dom.sourceFrame.setAttribute('class', 'hidden')
		this.dom.debugFrame.setAttribute('class', '')
		this.debug = new BackEmulatorDebug(this.machine, source,
			this.dom.debugContainer, this.dom.debug, this.callback, this)
	} catch (e) {
		console.log(e)
		alert(e.message)
		return
	}

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
	if (this.debug.isRunning) {
		this.debug.stop()
		this.showMachineState()
	}
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

BackEmulator.prototype.singleStep = function () {
	this.hideMachineState()
	this.debug.singleStep()
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

	var target = event.target
	if (target && (target.tagName == 'INPUT' || target.tagName == 'TEXTAREA')) return true

	switch (event.key) {
		case '5': this.singleStep(); break
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
			'<button title="Сохранить">*</button><button title="Удалить">x</button>')
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
	this.dom.sourceName.innerHTML = this.escape(name)
	this.closeProgramDialog()
}

BackEmulator.prototype.loadProgram = function (name) {
	var program = BackEmulatorStorage.get(name)
	if (program == undefined) this.refreshProgramList()
	else {
		this.dom.source.value = program
		this.dom.sourceName.innerHTML = this.escape(name)
		this.closeProgramDialog()
	}
}

BackEmulator.prototype.saveProgram = function (name) {
	var newName = prompt('Новое имя программы:', name)
	if (newName) {
		try {
			BackEmulatorStorage.replace(name, newName, this.dom.source.value)
			this.dom.sourceName.innerHTML = this.escape(newName)
		}
		catch (e) {
			alert(e)
		}
	}
	this.refreshProgramList()
}

BackEmulator.prototype.deleteProgram = function (name) {
	if (!confirm('Удалить программу "' + name + '"?')) return

	BackEmulatorStorage.remove(name)
	this.refreshProgramList()
}

BackEmulator.prototype.saveNewProgram = function () {
	var name = prompt('Имя программы:')
	if (name) {
		try {
			BackEmulatorStorage.add(name, this.dom.source.value)
			this.dom.sourceName.innerHTML = this.escape(name)
		}
		catch (e) {
			alert(e)
		}
	}
	this.refreshProgramList()
}
