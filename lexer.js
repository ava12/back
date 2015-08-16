function BackLexerException(message, line, pos) {
	this.line = line
	this.pos = pos
	this.message = message + ', line ' + line + ', char ' + pos
}

function BackToken(type, data, line) {
	this.type = type
	this.data = data
	this.line = line
}

BackToken.prototype.types = {
	name: 'name', // data: имя
	number: 'number', // data: число
	string: 'string', // data: строка
	label: 'label', // data: имя
	brace: 'brace', // data: "(" или ")"
	meta: 'meta' // data: команда
}

function BackLexer(source) {
	this.source = source.replace(/\r\n?/g, '\n') + '\n'
	this.sourceRe = /\n|\(|\)|\\::|(\\\\|\\\*)|\\.|"|'|(-?[0-9]+|0x[0-9a-fA-F]{1,4})|([^\0- \(\)\\"]+)/g
	this.lineNumber = 1
	this.linePos = 0
	this.match = null
}

BackLexer.prototype.next = function () {
	var value

	while (true) {
		this.match = this.sourceRe.exec(this.source)
		if (!this.match) return null

		if (this.match[1]) {
			var tail = (this.match[1] == '\\\\' ? '\n' : '*\\')
			var tailPos = this.source.indexOf(tail, this.match.index + 2)
			if (tailPos < 0) {

			}
		}

		if (this.match[2]) {
			value = Number(this.match[1])
			if (value < -32768 || value > 65535) {
				throw this.newException('number out of range')
			}

			return this.newToken(BackToken.types.number, value)
		}

		if (this.match[3]) {
			value = this.match[2]
			if (value.charAt(0) != ':') return this.newToken(BackToken.types.name, value)
			else return this.newToken(BackToken.types.label, value.substr(1))
		}

		value = this.match[0]
		switch (value.charAt(0)) {
			case '\n':
				this.linePos = this.match.index + 1
				this.lineNumber++
			continue

			case '(':
			case ')':
				return this.newToken(BackToken.types.brace, value)

			case '"':
			case "'":
				return this.stringToken()

			default:
				return this.newToken(BackToken.types.meta, value)
		}
	}
}

BackLexer.prototype.newToken = function (type, data) {
	return new BackToken(type, data, this.lineNumber)
}

BackLexer.prototype.newException = function (message) {
	return new BackLexerException(message, this.lineNumber, this.match.index - this.linePos + 1)
}