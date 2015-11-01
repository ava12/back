function BackEmulator()  {
	this.dom = {
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
	this.stateDom = ['cpu', 'ops', 'calls', 'ram']
	for (var i in this.dom) this.dom[i] = document.getElementById(this.dom[i])

	this.io = new BackEmulatorIo(this.dom.output)
	this.machine = null
	this.address = 0
	this.debug = null
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
		this.debug = new BackEmulatorDebug(this.machine, source, this.dom.debugContainer, this.dom.debug)
	} catch (e) {
		alert(e.message)
		return
	}

	this.dom.sourceFrame.setAttribute('class', 'hidden')
	this.dom.debugFrame.setAttribute('class', '')
}