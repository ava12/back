function BackEmulatorDebug(machine, source, view, content, callback, context) {
	var i, j

	this.machine = machine
	this.view = view
	this.content = content
	this.emulatorCallback = callback
	this.emulatorContext = context
	this.program = (new BackParser(source)).parse()

	this.debugInfo = this.program.debugInfo
	this.lines = this.getLines(this.program.debugInfo)
	for (i in this.program.breakLines) {
		for (j = this.program.breakLines[i].length; j > 1; j--) {
			delete this.program.breakPoints[program.breakLines[i].pop()]
		}
	}

	this.machine.setProgram(0, this.program.code)
	for (i in this.program.breakPoints) {
		this.machine.setBreakPoint(i, program.breakPoints[i])
		this.machine.toggleBreakPoint(i, true)
	}

	this.content.innerHTML = this.makeSourceHtml(source, this.program.breakLines)
	var t = this
	var rows = this.content.tBodies[0].childNodes
	for (i in rows) {
		rows[i].onclick = function () {
			t.toggleBreakPoint(this)
		}
	}

	this.viewHeight = this.view.clientHeight
	this.contentHeight = this.content.clientHeight
	this.lineHeight = Math.floor(this.viewHeight / this.lines.length)
	this.currentLine = null
	this.isRunning = false
	this.targetLine = null
	this.targetDepth = null
}

BackEmulatorDebug.prototype.getLines = function (debugInfo) {
	var result = [null]
	for (var i = 0; i < debugInfo.length; i++) {
		var line = debugInfo[i][2]
		if (result[line] == undefined) result[line] = debugInfo[i][0]
	}
	return result
}

BackEmulatorDebug.prototype.makeSourceHtml = function (source, breakLines) {
	source = source.split('\n')
	for (var i = 0; i < source.length; i++) {
		var className = ((i + 1) in breakLines ? ' class="break-on"' : '')
		source[i] = '<tr' + className + '><th>' + (i + 1) + '<th> <td>' + source[i].replace(/\s+$/, '')
	}
	return source.join('\r\n')
}

BackEmulatorDebug.prototype.scrollToLine = function (line) {
	var linePos = (line - 1) * this.lineHeight
	var viewPos = this.view.scrollTop
	var isVisible = (linePos >= viewPos && (linePos + this.lineHeight) <= (viewPos + this.contentHeight))
	if (!isVisible) {
		viewPos = linePos - this.lineHeight
		if (viewPos < 0) {
			viewPos = 0
		} else if (viewPos + this.viewHeight > this.contentHeight) {
			viewPos = this.contentHeight - this.viewHeight
		}
		this.view.scrollTop = viewPos
	}
}

BackEmulatorDebug.prototype.getLineForAddress = function (address) {
	var left = 0
	var right = this.debugInfo.length - 1
	while (left <= right) {
		var index = (left + right + 1) >> 1
		var entry = this.debugInfo[index]
		if (address >= entry[0] && address <= entry[1]) return entry[2]

		if (address < entry[0]) right = index - 1
		else left = index + 1
	}

	return null
}

BackEmulatorDebug.prototype.getAddressForLine = function (line) {
	while (line <= this.lines.length && this.lines[line] == undefined) line++
	return this.lines[line]
}

BackEmulatorDebug.prototype.toggleBreakPoint = function (dom) {
	var line = Number(dom.childNodes[0].innerHTML)
	var index
	var classes = (line === this.currentLine ? ['current'] : [])
	if (this.program.breakLines[line]) {
		classes.push('break-off')
		for (var i in this.program.breakLines[line]) {
			index = this.program.breakLines[line][i]
			this.machine.toggleBreakPoint(index, false)
			delete this.program.breakPoints[index]
		}
		delete this.program.breakLines[line]
	} else if (dom.className.split(/\s+/).indexOf('break-off') < 0) {
		classes.push('break-on')
		var address = this.getAddressForLine(line)

		for (index = 0; index < 16; index++) {
			if (this.program.breakPoints[index] == undefined) {
				this.machine.setBreakPoint(index, address)
				this.machine.toggleBreakPoint(index, true)
				this.program.breakPoints[index] = address
				this.program.breakLines[line] = [index]
				break
			}
		}
		if (index >= 16) {
			alert('Нельзя использовать больше 16 точек останова')
			return
		}
	}
	dom.setAttribute('class', classes.join(' '))
}

BackEmulatorDebug.prototype.highlightLine = function (line) {
	var row
	if (this.currentLine) {
		row = this.content.tBodies[0].childNodes[this.currentLine - 1]
		row.setAttribute('class', row.className.replace(/\s?current\s?/, ''))
	}
	this.currentLine = line
	if (line) {
		row = this.content.tBodies[0].childNodes[line - 1]
		row.setAttribute('class', 'current ' + row.className)
	}
}

BackEmulatorDebug.prototype.callback = function () {
	this.isRunning = false
	this.highlightLine(this.getLineForAddress(this.machine.ip))
	this.emulatorCallback.call(this.emulatorContext)
}

BackEmulatorDebug.prototype.run = function () {
	if (this.isRunning) return

	if (this.currentLine == undefined && this.machine.getBreakIndex(this.machine.ip) != undefined) {
		this.callback()
		return
	}

	this.highlightLine(null)
	this.isRunning = true
	this.machine.run(this.callback, this, 100)
}

BackEmulatorDebug.prototype.stop = function () {
	this.isRunning = false
	this.machine.stop()
}

BackEmulatorDebug.prototype.reset = function () {
	this.machine.reset()
	this.highlightLine(null)
}

BackEmulatorDebug.prototype.checkStepOut = function (line, depth) {
	return (line == this.targetLine || (depth && depth >= this.targetDepth))
}

BackEmulatorDebug.prototype.checkStepIn = function (line, depth) {
	return (line === this.targetLine)
}

BackEmulatorDebug.prototype.checkStepOver = function (line, depth) {
	return (line === this.targetLine || depth > this.targetDepth)
}

BackEmulatorDebug.prototype.handleStep = function (checkFunction, batchSize) {
	if (!this.isRunning) {
		this.callback()
		return
	}

	for (var batch = batchSize; batch > 0; batch--) {
		var status = this.machine.step()
		var line = this.getLineForAddress(this.machine.ip)
		var depth = this.machine.callStack.length
		this.isRunning = (checkFunction.call(this, line, depth) && status == BackMachineStatuses.manual)
		if (!this.isRunning) {
			this.callback()
			return
		}
	}

	var t = this
	setTimeout(function () {
		t.handleStep(checkFunction, batchSize)
	}, 0)
}

BackEmulatorDebug.prototype.step = function (checkFunction, batchSize) {
	if (this.isRunning) {
		this.stop()
		return
	}

	this.targetLine = this.currentLine
	this.targetDepth = this.machine.callStack.length

	if (!batchSize) batchSize = 1
	var t = this
	this.isRunning = true
	setTimeout(function () {
		t.handleStep(checkFunction, batchSize)
	}, 0)
}

BackEmulatorDebug.prototype.stepOut = function () {
	this.step(this.checkStepOut)
}

BackEmulatorDebug.prototype.stepIn = function () {
	this.step(this.checkStepIn)
}

BackEmulatorDebug.prototype.stepOver = function () {
	this.step(this.checkStepOver)
}
