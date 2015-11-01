function BackEmulatorIo(dom) {
	this.dom = dom
	this.input = ''
	this.output = ''
	this.pos = 0
}

BackEmulatorIo.prototype.escape = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;'
}

BackEmulatorIo.prototype.setInput = function (input) {
	this.input = String(input)
}

BackEmulatorIo.prototype.reset = function (input) {
	if (input != undefined) this.setInput(input)
	this.pos = 0
	this.output = ''
	this.dom.innerHTML = ''
}

BackEmulatorIo.prototype.read = function () {
	if (this.pos > this.input.length) return null

	this.pos++
	if (this.pos == this.input.length + 1) return 0

	return this.input.charCodeAt(this.pos - 1)
},

BackEmulatorIo.prototype.write = function (value) {
	value = String.fromCharCode(value)
	if (this.escape[value]) value = this.escape[value]
	this.output += value
	this.dom.innerHTML = this.output
	return true
}
