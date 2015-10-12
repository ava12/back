
function ARunnerException(Msg, Ptr) {
	this.Message = Msg
	this.Ptr = Ptr

	this.toString = function() {
		return this.Message + ' @' + this.Ptr
	}
}

function ARunner(Program, Inp, Callback) {
	this.Program = Program
	this.Inp = Inp
	this.InpPos = 0
	if (Callback) this.Callback = Callback
	else this.Callback = function(Reason, Data) { return true }

	this.OutBuffer = ''
	this.FlushLen = 128
	this.BatchLen = 256

	this.IsRunning = false
	this.Ip = 0
	this.Memory = {}
	this.Subs = {}
	this.OpStack = []
	this.CallStack = []

//---------------------------------------------------------------------------
	this.Reset = function() {
		this.IsRunning = false
		this.Ip = 0
		this.Memory = {}
		this.Subs = {}
		this.OpStack = []
		this.CallStack = []
		this.OutBuffer = ''
		this.InpPos = 0
	}

//---------------------------------------------------------------------------
	this.Run = function(Program, Inp, Callback) {
		if (Program) {
			this.Program = Program
			this.Reset()
		}
		if (Inp) this.Inp = Inp
		if (Callback) this.Callback = Callback

		this.IsRunning = true
		this.RunBatch(this)
	}

//---------------------------------------------------------------------------
	this.Stop = function() {
		this.IsRunning = false
	}


//---------------------------------------------------------------------------
	this.RunBatch = function(Runner) {
		if (!Runner.IsRunning) {
			Runner.Flush('stop')
			return
		}

		try {
			if (Runner.Exec() && Runner.Flush('run')) {
				setTimeout(Runner.RunBatch, 20, Runner)
			}
			else {
				this.IsRunning = false
				Runner.Flush('stop')
			}
		}

		catch(e) {
			Runner.IsRunning = false
			Runner.Flush()
			Runner.Callback('error', e)
		}
	}

//---------------------------------------------------------------------------
	this.Exec = function() {
		var Program = this.Program
		var Len = Program.length

		var t
		for(var Steps = this.BatchLen; Steps > 0; Steps--) {
			if (!this.IsRunning || this.Ip > Len) return false

			var OpCode = Program[this.Ip] & 15
			var Value = Program[this.Ip] >> 4
			this.Ip++

			try {
				switch(OpCode) {
					case 0:
						if (!this.CallStack) return false

						this.Ip = this.CallStack.pop()
					break

					case 1: this.Define(Value); break
					case 2: this.Push(Value); break
					case 3: this.Memory[Value] = this.Pop(); break

					case 4:
						t = this.Pop()
						if (this.Memory[t]) t = this.Memory[t]
						else t = 0
						this.Push(t)
					break

					case 5: this.Memory[this.Pop()] = this.Pop(); break
					case 6: this.Push(this.Read()); break
					case 7: this.Write(this.Pop()); break

					case 8:
						t = this.Pop()
						this.Push(((t & 0x7FFF) << 1) | ((t >> 15) & 1))
					break

					case 9:
						t = this.Pop()
						this.Push(((t & 0xFFFE) >> 1) | ((t & 1) << 15))
					break

					case 10:
						t = this.Pop()
						if (t) this.Pop()
						else {
							t = this.Pop()
							this.Pop()
							this.Push(t)
						}
					break

					case 11: this.SelectBits(); break

					case 12:
						t = this.Pop()
						if (this.Subs[t]) this.Ip = this.Subs[t]
						else return false
					break

					case 13:
						t = this.Pop()
						if (this.Subs[t]) {
							this.CallStack.push(this.Ip)
							if (this.CallStack.length > 0xFFFF) {
								throw new ARunnerException('call stack overflow')
							}

							this.Ip = this.Subs[t]
						}
					break

					case 14: this.Pop(); break

					default: throw new ARunnerException('invalid opcode: ' + OpCode)
				}
			}

			catch(e) {
				if (!(e instanceof ARunnerException)) throw e

				throw new ARunnerException(e.Message, this.Ip)
			}
		}

		return true
	}

//---------------------------------------------------------------------------
	this.Flush = function(Reason) {
		if (!Reason) Reason = 'output'
		if (!this.OutBuffer.length && Reason == 'output') return

		var Flag = this.Callback(Reason, this.OutBuffer)
		this.IsRunning &= Flag
		this.OutBuffer = ''
		return this.IsRunning
	}

//---------------------------------------------------------------------------
	this.Push = function(Value) {
		if (this.OpStack.length >= 0xFFFF) {
			throw new ARunnerException('operand stack overflow')
		}

		this.OpStack.push(Value & 0xFFFF)
	}

//---------------------------------------------------------------------------
	this.Pop = function() {
		if (!this.OpStack.length) {
			throw new ARunnerException('operand stack underflow')
		}

		return this.OpStack.pop()
	}

//---------------------------------------------------------------------------
	this.SelectBits = function() {
		var Flags = this.Pop()
		var Variants = [this.Pop(), this.Pop()]
		var Result = 0
		for(var i = 0, Mask = 1; i < 16; i++, Mask <<= 1, Flags >>= 1) {
			Result |= (Variants[Flags & 1] & Mask)
		}
		this.Push(Result)
	}

//---------------------------------------------------------------------------
	this.Write = function(Value) {
		this.OutBuffer = this.OutBuffer.concat(String.fromCharCode(Value))
		if (Value == 10 || this.OutBuffer.length >= this.FlushLen) {
			this.Flush()
		}
	}

//---------------------------------------------------------------------------
	this.Read = function() {
		this.Flush()
		if (!this.IsRunning) return null

		if (this.InpPos >= this.Inp.length) {
			this.InpPos = 0
			var t = prompt('Введите данные')
			if (t == undefined) t = ''
			this.Inp = t + '\n'
		}

		this.InpPos++
		return this.Inp.charCodeAt(this.InpPos - 1)
	}

//---------------------------------------------------------------------------
	this.Define = function(Index) {
		if (this.Subs[Index] != undefined) {
			throw new ARunnerException('cannot redefine subroutine ' + Index)
		}

		this.Subs[Index] = this.Ip
		var Program = this.Program
		var Level = 1
		var Len = Program.length
		for(; this.Ip < Len; this.Ip++) {
			var OpCode = Program[this.Ip] & 15
			if (OpCode == 1) Level++
			else if(OpCode == 0) {
				Level--
				if (Level <= 0) {
					this.Ip++
					return
				}
			}
		}

		throw new ARunnerException('subroutine has no end')
	}

//---------------------------------------------------------------------------
}