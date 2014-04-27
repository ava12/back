
function ALexerException(Msg, Source, Pos) {
	this.Message = Msg
	Source = Source.substr(0, Pos).split('\n')
	this.Line = Source.length
	Source = Source.pop().replace(/^\r/, '')
	this.Char = Source.length + 1

	this.toString = function() {
		return this.Message + ' @' + this.Line + ',' + this.Char
	}
}

function ALexer(Source) {
	this.Source = Source
	this.Re = new RegExp(
		'\\(|\\)|!!|!|;' + // скобки и пр.
		'|\\\\\\\\.*?(?:\\n|$)' + // однострочный комментарий
		'|\\\\\\*.*?\\*\\\\' + // многострочный комментарий
		'|"(?:""|[^"])*"' + // строка в двойных кавычках
		"|'(?:''|[^'])*'" + // строка в одинарных кавычках
		'|(0[xX][0-9A-Fa-f]+|-[0-9]+|[0-9]+)' + // число
		'|([^\\s"\'()!;]+)' + // произвольный допустимый набор
		'|(\\S)', // недопустимый набор
		'g')
	this.LastMatch = null
	this.BraceStack = []
	this.EoS = false

//---------------------------------------------------------------------------
	this.Emit = function(Type, Pos, Value) {
		var Result = this.LastMatch
		if (Type == undefined) this.LastMatch = null
		else this.LastMatch = {Type: Type, Pos: Pos, Value: Value}
		if (!this.LastMatch) this.EoS = true
		return Result
	}

//---------------------------------------------------------------------------
	this.Next = function() {
		if (!this.Source || this.EoS) return null

		var Result
		while(true) {
			var Match = this.Re.exec(this.Source)
			if (!Match) {
				if (!this.BraceStack.length) return this.Emit()
				else throw new ALexerException('unexpected end of file', this.Source, this.Source.length)
			}

			if (Match[3]) {
				throw new ALexerException('unexpected character: ' + Match[3], this.Source, Match.index)
			}

			if (Match[2]) {
				if (Match[2] == '\\*') {
					throw new ALexerException('unexpected end of file', this.Source, this.Source.length)
				}

				Result = this.Emit('', Match.index, Match[2])
				if (Result) return Result
				else continue
			}

			if (Match[1]) {
				Result = parseInt(Match[1])
				if (isNaN(Result)) {
					throw new ALexerException('invalid number: ' + Match[1], this.Source, Match.index)
				}

				Result = this.Emit('1', Match.index, Result & 0xFFFF)
				if (Result) return Result
				else continue
			}

			switch(Match[0].substr(0, 1)) {
				case '\\':
					continue
				break

				case '(':
					this.BraceStack.push(this.LastMatch)
					this.LastMatch = null
					continue
				break

				case ')':
					if (!this.BraceStack.length) {
						throw new ALexerException('unexpected )', this.Source, Match.index)
					}

					Result = this.LastMatch
					this.LastMatch = this.BraceStack.pop()
					if (Result) return Result
				break

				case '"': case "'":
					Result = Match[0].substr(0, 1)
					Result = Match[0].replace(new RegExp(Result + '(' + Result + '?)', 'g'), '$1')
					Result = this.Emit('"', Match.index, Result)
					if (Result) return Result
				break

				case '!': case ';':
					Result = this.Emit('', Match.index, Match[0])
					if (Result) return Result
				break
			}
		}
	}
}