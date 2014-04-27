
function AParser(Lexer) {
	this.Lexer = Lexer
	this.Program = []
	this.Macros = {}
	this.Commands = {':': true, ';': true, '\\:': true, '\\>': true}
	var t = [
		'@', '=', '.<<', '.>>', '<<', '>>', '?', '??', '!!', '!', '$',
	]
	for(var i in t) this.Commands[t[i]] = Number(i) + 4


//---------------------------------------------------------------------------
	this.Parse = function(Lexer) {
		if (Lexer) this.Lexer = Lexer
		else Lexer = this.Lexer
		this.Program = []
		this.Macros = {}
		if (!Lexer) return []

		this.Emit()
		return this.Program
	}


//---------------------------------------------------------------------------
	this.Emit = function() {
		while(true) {
			var Token = this.NextToken()
			if (!Token) return null

			var Value = Token.Value
			switch(Token.Type) {
				case '1': this.EmitNumber(Value); break
				case '"': this.EmitString(Value); break

				case '':
					var OpCode = this.Commands[Value]
					if (typeof OpCode == 'number') this.EmitOpCode(OpCode)
					else {
						switch(Value) {
							case ';': return Token; break
							case ':': this.EmitSubroutine(); break
							case '\\:': this.EmitMacro(); break
							case '\\>': this.EmitMemory(); break
						}
					}
				break
			}
		}
	}

//---------------------------------------------------------------------------
	this.NextToken = function() {
		var Token = this.Lexer.Next()
		if (!Token) return null

		if (Token.Type == '' && !this.Commands[Token.Value]) {
			var Value = this.Macros[Token.Value]
			if (Value == undefined) {
				throw new ALexerException('unknown token: ' + Token.Value, this.Lexer.Source, Token.Pos)
			}

			Token.Value = Value
			Token.Type = (typeof Value == 'number' ? '1' : '"')
		}

		return Token
	}

//---------------------------------------------------------------------------
	this.NextNumber = function() {
		var Token = this.NextToken()
		if (!Token) {
			throw new ALexerException('unexpected end of input', this.Lexer.Source, this.Lexer.Source.length)
		}

		if (Token.Type != '1') {
			throw new ALexerException('number expected, ' + Token.Value + ' found', this.Lexer.Source, Token.Pos)
		}

		return Token.Value
	}

//---------------------------------------------------------------------------
	this.NextMacro = function() {
		var Token = this.Lexer.Next()
		if (!Token) {
			throw new ALexerException('unexpected end of input', this.Lexer.Source, this.Lexer.Source.length)
		}

		if (Token.Type != '' || this.Commands[Token.Value]) {
			throw new ALexerException('macro expected, ' + Token.Value + ' found', this.Lexer.Source, Token.Pos)
		}

		if (this.Macros[Token.Value]) {
			throw new ALexerException('cannot redefine macro ' + Token.Value, this.Lexer.Source, Token.Pos)
		}

		return Token.Value
	}

//---------------------------------------------------------------------------
	this.EmitNumber = function(Num, OpCode) {
		if (OpCode == undefined) OpCode = 2
		this.Program.push((Num << 4) | OpCode)
	}

//---------------------------------------------------------------------------
	this.EmitOpCode = function(OpCode) {
		this.Program.push(OpCode)
	}

//---------------------------------------------------------------------------
	this.EmitString = function(Str, Addr) {
		var Len = Str.length
		for (var i = Len - 1; i >= 0; i--) {
			this.EmitNumber(Str.charCodeAt(i))
		}
		if (Addr != undefined) {
			for(i = 0; i < Len; i++) {
				this.EmitNumber(Addr, 3)
				Addr = (Addr + 1) & 0xFFFF
			}
		}
	}

//---------------------------------------------------------------------------
	this.EmitSubroutine = function() {
		this.EmitNumber(this.NextNumber(), 1)
		var Token = this.Emit()
		if (!Token) {
			throw new ALexerException('unexpected end of file', this.Lexer.Source, this.Lexer.Source.length)
		}

		if (Token.Type != '' || Token.Value != ';') {
			throw new ALexerException('; expected, ' + Token.Value + ' found', this.Lexer.Source, Token.Pos)
		}

		this.EmitOpCode(0)
	}

//---------------------------------------------------------------------------
	this.EmitMacro = function() {
		var Name = this.NextMacro()
		var Value = this.NextNumber()
		this.Macros[Name] = Value
	}

//---------------------------------------------------------------------------
	this.EmitMemory = function() {
		var Addr = this.NextNumber()
		var Str = ''
		while(true) {
			var Token = this.NextToken()
			if (!Token) {
				throw new ALexerException('unexpected end of file', this.Lexer.Source, this.Lexer.Source.length)
			}

			switch(Token.Type) {
				case '"':
					Str = Str.concat(Token.Value)
				break

				case '1':
					Str = Str.concat(String.fromCharCode(Token.Value))
				break

				case '':
					if (Token.Value == ';') {
						this.EmitString(Str, Addr)
						return
					}

					throw new ALexerException('string or number expected, ' + Token.Value + ' found', this.Lexer.Source, Token.Pos)
				break
			}
		}
	}

//---------------------------------------------------------------------------
//---------------------------------------------------------------------------
//---------------------------------------------------------------------------
}