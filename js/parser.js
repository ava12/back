function BackParserException(message, line, pos) {
	this.line = line
	this.pos = pos
	this.message = message
	if (line) this.message += ', строка ' + line
	if (pos) this.message += ', позиция ' + pos
}


function BackProgram(code, debugInfo, breakPoints, breakLines) {
	this.code = code // строка
	this.debugInfo = debugInfo // [[первый_адрес, последний_адрес, строка]]
	this.breakPoints = breakPoints // {индекс: адрес}
	this.breakLines = breakLines // {номер_строки: [индексы]}
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
			case BackTokenTypes.meta:
				if (this.tokenStack.length) {
					throw new BackParserException('метакоманда внутри скобок', token.line, token.pos)
				}
			break

			case BackTokenTypes.brace:
				if (this.lastToken && this.lastToken.type == BackTokenTypes.meta) {
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
	this.names = { // [тип, данные]
		':!!':  {type: this.types.op, data: BackMachineOpcodes.hlt},
		':.':   {type: this.types.op, data: BackMachineOpcodes.ret},
		':^':   {type: this.types.op, data: BackMachineOpcodes.call},
		':^^':  {type: this.types.op, data: BackMachineOpcodes.jmp},
		':@':   {type: this.types.op, data: BackMachineOpcodes.ld},
		':=':   {type: this.types.op, data: BackMachineOpcodes.st},
		':.<':  {type: this.types.op, data: BackMachineOpcodes.ins},
		':.>':  {type: this.types.op, data: BackMachineOpcodes.outs},
		':<<': {type: this.types.op, data: BackMachineOpcodes.shl},
		':>>':  {type: this.types.op, data: BackMachineOpcodes.shr},
		':?':   {type: this.types.op, data: BackMachineOpcodes.test},
		':??':  {type: this.types.op, data: BackMachineOpcodes.bt},
		':$':   {type: this.types.op, data: BackMachineOpcodes.dup}
	}
	this.localNames = this.names

	this.lexer = new BackLexer(source)
	this.queue = new BackParserQueue(this.lexer)
	this.code = []
	this.breakPoints = {}
	this.breakLines = {}
	this.debug = [] // [строка: [адреса]]
	this.program = null
}

BackParser.prototype.types = {
	none: 'none', // {labels: [], subs: []}
	op: 'op', // код (0 - 15)
	num: 'num', // значение
	func: 'func', // адрес
	sub: 'sub', // адрес
	macro: 'macro' // [лексемы]
}

BackParser.prototype.opChars = '0123456789jklmno'

BackParser.prototype.emitFunctions = {
	name: 'emitNameToken',
	number: 'emitNumberToken',
	string: 'emitStringToken',
	label: 'emitLabelToken',
	meta: 'emitMetaToken'
}

BackParser.prototype.meta = {
	set: '\\=',
	macro: '\\%',
	func: '\\:',
	sub: '\\::',
	breakPoint: '\\#',
	beginLocal: '\\{',
	endLocal: '\\}'
}

BackParser.prototype.newException = function (message, token) {
	if (!token) token = new BackToken()
	return new BackParserException(message, token.line, token.pos)
}

BackParser.prototype.parse = function () {
	if (this.program) return this.program

	var token
	while (token = this.queue.next()) {
		this.emitToken(token)
	}

	if (this.localNames !== this.names) {
		throw new BackParserException('не закрыта локальная область видимости имен')
	}

	this.checkUnresolvedNames()
	this.program = new BackProgram(this.convertCode(), this.convertDebugInfo(),
		this.breakPoints, this.breakLines)
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
	this[this.emitFunctions[token.type]](token)
}

BackParser.prototype.emitNumber = function (value, line) {
	var ops
	if (value >= 0x8000) value -= 0x10000
	if (value < 8 && value >= -8) {
		ops = [BackMachineOpcodes.dn, value & 0xf]
	}	else if (value < 128 && value >= -128) {
		ops = [BackMachineOpcodes.db, (value & 0xf0) >> 4, value & 0xf]
	}	else {
		ops = [BackMachineOpcodes.dw, (value & 0xf000) >> 12, (value & 0xf00) >> 8,
			(value & 0xf0) >> 4, value & 0xf]
	}
	this.emit(ops, line)
}

BackParser.prototype.emitNumberToken = function (token) {
	this.emitNumber(token.data, token.line)
}

BackParser.prototype.emitStringToken = function (token) {
	for (var i = token.data.length - 1; i >= 0; i--) {
		this.emitNumber(token.data.charCodeAt(i), token.line)
	}
}

BackParser.prototype.getName = function (name, local) {
	var key = ':' + name
	var entry = this.localNames[key]
	if (!entry) {
		if (!local) entry = this.names[key]
		if (!entry) {
			entry = {type: this.types.none, labels: [], subs: []}
			this.localNames[key] = entry
		}
	}

	return entry
}

BackParser.prototype.emitLabelToken = function (token) {
	var entry = this.getName(token.data)
	if (entry.type == this.types.none) {
		entry.labels.push(this.code.length + 1)
		this.emit([BackMachineOpcodes.dw, 0, 0, 0, 0], token.line)
		return
	}

	switch (entry.type) {
		case this.types.num:
		case this.types.func:
		case this.types.sub:
			this.emitNumber(entry.data, token.line)
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
	var entry = this.getName(token.data)
	if (entry.type == this.types.none) {
		entry.subs.push(this.code.length + 1)
		this.emit([BackMachineOpcodes.dw, 0, 0, 0, 0, BackMachineOpcodes.hlt], token.line)
		return
	}

	switch (entry.type) {
		case this.types.op:
			this.emit(entry.data, token.line)
		break

		case this.types.num:
			this.emitNumber(entry.data, token.line)
		break

		case this.types.func:
		case this.types.sub:
			this.emitNumber(entry.data, token.line)
			var op = (entry.type == this.types.func ? BackMachineOpcodes.call : BackMachineOpcodes.jmp)
			this.emit(op, token.line)
		break

		case this.types.macro:
			for (var i = 0; i < entry.data.length; i++) {
				entry.data[i].line = token.line
				this.emitToken(entry.data[i])
			}
		break
	}
}

BackParser.prototype.emitMetaToken = function (token) {
	if (token.data == this.meta.macro) {
		this.defineMacro()
		return
	}

	var tokens, value

	switch (token.data) {
		case this.meta.breakPoint:
			tokens = this.fetch(BackTokenTypes.number)
			value = tokens[0].data & 15
			if (value in this.breakPoints) {
				throw this.newException('точка останова ' + value + ' уже задана', tokens[0])
			} else {
				this.breakPoints[value] = this.code.length
				if (this.breakLines[token.line]) this.breakLines[token.line].push(value)
				else this.breakLines[token.line] = [value]
			}
		break

		case this.meta.set:
			tokens = this.fetch([BackTokenTypes.name, BackTokenTypes.number])
			this.setName(tokens[0].data, this.types.num, tokens[1].data, tokens[0])
		break

		case this.meta.func:
		case this.meta.sub:
			var type = (token.data == this.meta.func ? this.types.func : this.types.sub)
			tokens = this.fetch(BackTokenTypes.name)
			this.setName(tokens[0].data, type, this.code.length, tokens[0])
		break

		case this.meta.beginLocal:
			if (this.localNames === this.names) this.localNames = {}
			else throw this.newException('локальная область видимости уже задана')
		break

		case this.meta.endLocal:
			if (this.localNames === this.names) {
				throw this.newException('локальная область видимости не задана')
			}

			this.fixUnresolvedLocals()
			this.localNames = this.names
		break

		default:
			throw this.newException('неизвестная директива: ' + token.data, token)
	}
}

BackParser.prototype.fixUnresolvedLocals = function () {
	for (var key in this.localNames) {
		if (key.charAt(0) != ':') continue

		var entry = this.localNames[key]
		if (entry.type != this.types.none) continue

		if (!this.names[key]) this.names[key] = entry
		else {
			var globalEntry = this.names[key]
			globalEntry.labels = globalEntry.labels.concat(entry.labels)
			globalEntry.subs = globalEntry.subs.concat(entry.subs)
		}
	}
}

BackParser.prototype.fetch = function (types) {
	if (!(types instanceof Array)) types = [types]
	var result = []

	for (var i = 0; i < types.length; i++) {
		var token = this.queue.next()
		if (!token) {
			throw this.newException('неожиданный конец программы, ожидается ' + BackTokenTypeNames[token.type])
		}

		if (token.type != types[i]) {
			throw this.newException('ожидается: ' + BackTokenTypeNames[types[i]] +
				', получено: ' + BackTokenTypeNames[token.type], token)
		}

		result.push(token)
	}
	return result
}

BackParser.prototype.setName = function (name, type, value, token) {
	var entry = this.getName(name, true)
	if (entry.type != this.types.none) {
		throw this.newException('имя ' + name + ' уже задано', token)
	}

	this.localNames[':' + name] = {type: type, data: value}
	if (type != this.types.num && type != this.types.func && type != this.types.sub) return

	var patch = [(value & 0xf000) >> 12, (value & 0xf00) >> 8, (value & 0xf0) >> 4, value & 0xf]
	for (i = 0; i < 4; i++) patch[i] = this.opChars.charAt(patch[i])
	var addr = entry.labels
	var i, j
	for (i = 0; i < addr.length; i++) {
		for (j = 0; j < 4; j++) this.code[addr[i] + j] = patch[j]
	}

	addr = entry.subs
	if (!addr.length) return

	if (type == this.types.num) {
		throw this.newException('имя ' + name + ' уже используется как вызов или переход на подпрограмму', token)
	}

	patch.push(this.opChars.charAt(type == this.types.func ? BackMachineOpcodes.call : BackMachineOpcodes.jmp))
	for (i = 0; i < addr.length; i++) {
		for (j = 0; j < 5; j++) this.code[addr[i] + j] = patch[j]
	}
}

BackParser.prototype.defineMacro = function () {
	var token = this.fetch(BackTokenTypes.name)[0]
	var name = token.data
	var macro = []
	this.setName(name, this.types.macro, macro, token)

	while (true) {
		token = this.queue.next()
		if (!token) throw this.newException('неожиданный конец программы')

		if (token.type == BackTokenTypes.meta) {
			throw this.newException('директивы недопустимы внутри макросов', token)
		}

		if (token.type == BackTokenTypes.name) {
			var entry = this.names[':' + token.data]
			if (entry && entry.type == this.types.op && entry.data == BackMachineOpcodes.ret) {
				break
			}
		}

		macro.push(token)
	}
}

BackParser.prototype.checkUnresolvedNames = function () {
	var unresolved = []
	for (var key in this.names) {
		var entry = this.names[key]
		if (entry.type == this.types.none) unresolved.push(key.substr(1))
	}
	if (unresolved.length) {
		throw new BackParserException('не определены имена: ' + unresolved.join(', '))
	}
}

BackParser.prototype.convertCode = function () {
	return this.code.join('')
}

BackParser.prototype.convertDebugInfo = function () {
	var result = []
	for (var line in this.debug) {
		line = Number(line)
		if (!line) continue

		var entry = this.debug[line]
		var index = 0
		while (index < entry.length) {
			var first = entry[index]
			var last = first
			for (; index++, entry[index] == last + 1; last++);
			result.push([first, last, line])
		}
	}

	result.sort(function (a, b) {
		return (a[0] - b[0])
	})
	return result
}
