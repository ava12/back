function BackParserException(message, line, pos) {
	this.line = line
	this.pos = pos
	this.message = message
	if (line) this.message += ', строка ' + line
	if (pos) this.message += ', позиция ' + pos
}


function BackProgram(code, debugInfo, breakPoints) {
	this.code = code // строка
	this.debugInfo = debugInfo // [[строка, первый_адрес, последний_адрес]]
	this.breakPoints = breakPoints // {индекс: адрес}
}


function BackParserQueue(lexer) {
	this.lexer = lexer
	this.lastToken = null
	this.tokenStack = []
}

BackParserQueue.prototype.next = function () {
	var result = null

	while (!result) {
		var token = this.lexer.next()

		if (!token) {
			if (this.tokenStack.length) {
				throw new BackParserException('отсутствует закрывающая скобка', this.lexer.lineNumber)
			}

			result = this.lastToken
			this.lastToken = null
			break
		}

		switch (token.type) {
			case BackToken.types.meta:
				if (this.tokenStack.length) {
					throw new BackParserException('метакоманда внутри скобок', token.line, token.pos)
				}
			break

			case BackToken.types.brace:
				if (this.lastToken && this.lastToken.type == BackToken.types.meta) {
					throw new BackParserException('скобка после метакоманды', token.line, token.pos)
				}

				if (token.data == '(') {
					this.tokenStack.push(this.lastToken)
					this.lastToken = null
				} else if (this.tokenStack.length) {
					result = this.lastToken
					this.lastToken = this.tokenStack.pop()
				} else {
					throw new BackParserException('отсутствует открывающая скобка', token.line, token.pos)
				}

				continue
			break
		}

		result = this.lastToken
		this.lastToken = token
	}

	return result
}


function BackParser(source) {
	this.names = {
		':!!':  [this.types.op, BackMachine.opcodes.hlt],
		':.':   [this.types.op, BackMachine.opcodes.ret],
		':^':   [this.types.op, BackMachine.opcodes.call],
		':^^':  [this.types.op, BackMachine.opcodes.jmp],
		':@':   [this.types.op, BackMachine.opcodes.ld],
		':=':   [this.types.op, BackMachine.opcodes.st],
		':.<':  [this.types.op, BackMachine.opcodes.ins],
		':.>':  [this.types.op, BackMachine.opcodes.outs],
		':<<<': [this.types.op, BackMachine.opcodes.sh],
		':<<':  [this.types.op, BackMachine.opcodes.sa],
		':?':   [this.types.op, BackMachine.opcodes.test],
		':??':  [this.types.op, BackMachine.opcodes.bt],
		':$':   [this.types.op, BackMachine.opcodes.dup]
	}

	this.lexer = new BackLexer(source)
	this.queue = new BackParserQueue(this.lexer)
	this.code = []
	this.breakPoints = {}
	this.debug = [] // [строка: [адреса]]
	this.labels = {} // {имя: [адреса]}
	this.subs = {} // {имя: [адреса]}
	this.program = null
}

BackParser.prototype.types = {
	op: 'op', // [тип, код (0 - 15)]
	num: 'num', // [тип, значение]
	func: 'func', // [тип, адрес]
	sub: 'sub', // [тип, адрес]
	macro: 'macro' // [тип, [лексемы]]
}

BackParser.prototype.opChars = '0123456789jklmno'

BackParser.prototype.emitFunctions = {
	BackToken.types.name: 'emitNameToken',
	BackToken.types.number: 'emitNumberToken',
	BackToken.types.string: 'emitStringToken',
	BackToken.types.label: 'emitLabelToken',
	BackToken.types.meta: 'emitMetaToken'
}

BackParser.prototype.meta = {
	set: '\\=',
	macro: '\\%',
	func: '\\:',
	sub: '\\::',
	breakPoint: '\\#'
}

BackParser.prototype.newException = function (message, token) {
	return new BackParserException(message, token.line, token.pos)
}

BackParser.prototype.parse = function () {
	if (this.program) return this.program

	var token
	while (token = this.queue.next()) {
		this.emitToken(token)
	}

	this.checkUnresolvedNames()
	this.program = new BackProgram(this.convertCode(), this.convertDebugInfo(), this.breakPoints)
	return this.program
}

BackParser.prototype.emit = function (ops, line) {
	if (!(ops instanceof Array)) ops = [ops]
	if (!this.debug[line]) this.debug[line] = []
	var address = this.code.length
	for (var i = 0; i < ops.length; i++) {
		this.code.push(this.opChars[ops[i]])
		this.debug[line].push(address)
		address++
	}
}

BackParser.prototype.emitToken = function (token) {
		this.emitFunctions[token.type].call(this, token)
}

BackParser.prototype.emitNumber = function (value, line) {
	var ops
	if (value >= 0x8000) value -= 0x10000
	if (value < 8 && value >= -8) {
		ops = [BackMachine.opcodes.dn, value & 0xf]
	}	else if (value < 128 && value > -128) {
		ops = [BackMachine.opcodes.db, (value & 0xf0) >> 4, value & 0xf]
	}	else {
		ops = [BackMachine.opcodes.dw, (value & 0xf000) >> 12, (value & 0xf00) >> 8,
			(value & 0xf0) >> 4, value & 0xf]
	}
	this.emit(ops, line)
}

BackParser.prototype.emitNumberToken = function (token) {
	this.emitNumber(token.data)
}

BackParser.prototype.emitStringToken = function (token) {
	for (var i = token.data.length - 1; i >= 0; i--) {
		this.emitNumber(token.data.charCodeAt(i))
	}
}

BackParser.prototype.emitLabelToken = function (token) {
	var key = ':' + token.data
	var entry = this.names[key]
	if (!entry) {
		if (!this.labels[key]) this.labels[key] = []
		this.labels[key].push(this.code.length + 1)
		this.emit([BackMachine.opcodes.dw, 0, 0, 0, 0], token.line)
		return
	}

	switch (entry[0]) {
	case this.types.num:
		case this.types.func:
		case this.types.sub:
			this.emitNumber(entry[1], token.line)
		break

		case this.types.op:
			throw this.newException('метка не может указывать на код операции', token)
		break

		case this.types.macro:
			throw this.newException('метка не может указывать на макрос', token)
		break
	}
}

BackParser.prototype.emitNameToken = function (token) {
	var key = ':' + token.data
	var entry = this.names[key]
	if (!entry) {
		if (!this.subs[key]) this.subs[key] = []
		this.subs[key].push(this.code.length + 1)
		this.emit([BackMachine.opcodes.dw, 0, 0, 0, 0, BackMachine.opcodes.hlt], token.line)
		return
	}

	switch (entry[0]) {
		case this.types.op:
			this.emit(entry[1], token.line)
		break

		case this.types.num:
			throw this.newException('имя константы не может использоваться как вызов или переход на подпрограмму', token)
		break

		case this.types.func:
		case this.types.sub:
			this.emitNumber(entry[1], token.line)
			var op = (entry[0] == this.types.func ? BackMachine.opcodes.call : BackMachine.opcodes.jmp)
			this.emit(op, token.line)
		break

		case this.types.macro:
			for (var i = 0; i < entry[1].length; i++) {
				this.emitToken(entry[1][i])
			}
		break
	}
}

BackParser.prototype.emitMetaToken = function (token) {
	if (token.data == this.meta.macro) {
		this.defineMacro()
		break
	}

	var tokens, value

	switch (token.data) {
		case this.meta.breakPoint:
			tokens = this.fetch(this.types.num)
			value = tokens[0].data & 15
			if (!(value in this.breakPoints)) this.breakPoints[value] = this.code.length
			else throw this.newException('точка останова ' + value + ' уже задана', tokens[0])
		break

		case this.meta.set:
			tokens = this.fetch([this.types.name, this.types.num])
			this.setName(tokens[0].data, this.types.num, tokens[1].data, tokens[0])
		break

		case this.meta.func:
		case this.meta.sub:
			var type = (token.data == this.meta.func ? this.types.func : this.types.sub)
			tokens = this.fetch(this.types.name)
			this.setName(tokens[0].data, type, this.code.length, tokens[0])
		break

		default:
			throw this.newException('неизвестная директива: ' + token.data, token)
	}
}

BackParser.prototype.fetch = function (types) {
	if (!(types instanceof Array)) types = [types]
	var result = []

	for (var i = 0; i < types.length; i++) {
		var token = this.queue.next()
		if (!token) {
			throw this.newException('неожиданный конец программы, ожидается ' + BackToken.typeNames[token.type])
		}

		if (token.type != types[i]) {
			throw this.newException('ожидается: ' + token.typeNames[types[i]] +
				', получено: ' + token.typeNames[token.type], token)
		}

		result.push(token)
	}
}

BackParser.prototype.setName = function (name, type, value, token) {
	var key = ':' + name
	if (key in this.names) throw this.newException('имя ' + name + ' уже задано', token)

	this.names[key] = [type, value]
	if (type != this.types.num && type != this.types.func && type != this.types.sub) return

	var patch = [(value & 0xf000) >> 12, (value & 0xf00) >> 8, (value & 0xf0) >> 4, value & 0xf]
	var addr = this.labels[key]
	var i
	if (addr) {
		for (i = 0; i < addr.length; i++) this.code.splice(addr[i], 4, patch)
	}

	addr = this.subs[key]
	if (!addr) return

	if (type == this.types.num) {
		throw this.newException('имя ' + name + ' уже используется как вызов или переход на подпрограмму', token)
	}

	patch.push(type == this.types.func ? BackMachine.opcodes.call : BackMachine.opcodes.jmp)
	for (i = 0; i < addr.length; i++) this.code.splice(addr[i], 5, patch)
}

BackParser.prototype.defineMacro = function () {
	var token = this.fetch(this.types.name)
	var name = token.data
	var macro = []
	this.setName(name, this.types.macro, macro, token)

	while (true) {
		token = this.queue.next()
		if (!token) throw this.newException('неожиданный конец программы')

		if (token.type == BackToken.types.meta) {
			throw this.newException('директивы недопустимы внутри макросов', token)
		}

		if (token.type == BackToken.types.name) {
			var entry = this.names[':' + token.data]
			if (entry && entry[0] == this.types.op && entry[1] == BackMachine.opcodes.ret) {
				break
			}
		}

		macro.push(token)
	}
}

BackParser.prototype.checkUnresolvedNames = function () {
	var unresolved = []
	
}

BackParser.prototype.convertCode = function () {

}

BackParser.prototype.convertDebugInfo = function () {

}
