function BackLexerException(message, line, pos) {
	this.line = line
	this.pos = pos
	this.message = message + ', строка ' + line + ', символ ' + pos
}


function BackToken(type, data, line) {
	this.type = type
	this.data = data
	this.line = line
}

BackTokenTypes = {
	name: 'name', // data: имя
	number: 'number', // data: число
	string: 'string', // data: строка
	label: 'label', // data: имя
	brace: 'brace', // data: "(" или ")"
	meta: 'meta' // data: команда
}

BackTokenTypeNames = {
	name: 'имя',
	number: 'число',
	string: 'строка',
	label: 'метка',
	brace: 'скобка',
	meta: 'директива'
}

function BackLexer(source) {
	this.source = source.replace(/\r\n?/g, '\n')
	this.sourceRe = /\n|\(|\)|\\::|(\\\\|\\\*)|\\.|"|'|(0x[0-9a-fA-F]{1,4}|-?[0-9]+)|([^\0- \(\)\\"]+)/g
	this.lineNumber = 1
	this.linePos = 0
	this.match = null
}

BackLexer.prototype.next = function () {
	var value

	while (true) {
		this.match = this.sourceRe.exec(this.source)
		if (!this.match) {
			this.source = ''
			return null
		}

		if (this.match[1]) {
			this.search(this.match[1] == '\\\\' ? '\n' : '*\\')
			continue
		}

		if (this.match[2]) {
			value = Number(this.match[2])
			if (value < -32768 || value > 65535) {
				throw this.newException('неверное значение числа')
			}

			return this.newToken(BackTokenTypes.number, value & 0xffff)
		}

		if (this.match[3]) {
			value = this.match[3]
			if (value.charAt(0) != ':') return this.newToken(BackTokenTypes.name, value)
			else return this.newToken(BackTokenTypes.label, value.substr(1))
		}

		value = this.match[0]
		switch (value.charAt(0)) {
			case '\n':
				this.linePos = this.match.index + 1
				this.lineNumber++
			continue

			case '(':
			case ')':
				return this.newToken(BackTokenTypes.brace, value)

			case '"':
			case "'":
				return this.stringToken(value)

			default:
				return this.newToken(BackTokenTypes.meta, value)
		}
	}
}

BackLexer.prototype.search = function (what) {
	var startPos = this.sourceRe.lastIndex
	var pos = this.source.indexOf(what, startPos)
	var found = (pos >= 0)
	if (!found) pos = this.source.length
	var text = this.source.substring(startPos, pos)
	var lines = (text + what).split('\n')
	this.lineNumber += lines.length - 1
	this.linePos = startPos + text.length - lines.pop().length
	this.sourceRe.lastIndex += text.length + what.length
	return (found ? text : null)
}

BackLexer.prototype.newToken = function (type, data) {
	return new BackToken(type, data, this.lineNumber)
}

BackLexer.prototype.newException = function (message) {
	return new BackLexerException(message, this.lineNumber, this.match.index - this.linePos + 1)
}

BackLexer.prototype.stringToken = function (quote) {
	var line = this.lineNumber
	var fragmentPos = this.match.index + 1
	var pos = fragmentPos - this.linePos
	var text = this.search(quote)
	var message = 'отсутствует закрывающая кавычка'
	if (text == undefined) throw new BackLexerException(message, line, pos)

	fragmentPos += text.length + 1
	while (this.source.charAt(fragmentPos) == quote) {
		this.sourceRe.lastIndex++
		var fragment = this.search(quote)
		if (fragment == undefined) throw new BackLexerException(message, line, pos)

		text += quote + fragment
		fragmentPos += fragment.length + 2
	}

	return new BackToken(BackTokenTypes.string, text, line)
}