function BackEmulatorIo(dom) {
	this.dom = dom
	this.input = ''
	this.output = ''
	this.pos = 0
}

BackEmulatorIo.prototype.setInput = function (input) {
	this.input = String(input).replace(/\r\n?/g, '\n')
}

BackEmulatorIo.prototype.reset = function (input) {
	if (input != undefined) this.setInput(input)
	this.pos = 0
	this.output = ''
	this.dom.value = ''
}

BackEmulatorIo.prototype.read = function () {
	if (this.pos > this.input.length) return null

	this.pos++
	if (this.pos == this.input.length + 1) return 0

	return this.input.charCodeAt(this.pos - 1)
}

BackEmulatorIo.prototype.write = function (value) {
	this.output += String.fromCharCode(value)
	if (value < 32) this.dump()
	return true
}

BackEmulatorIo.prototype.dump = function () {
	this.dom.value = this.output
	this.dom.scrollTop += 1000
}
