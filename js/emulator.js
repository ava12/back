function BackEmulator()  {
	this.dom = {
		input: 'input',
		output: 'output',
		ip: 'ip',
		cpu: 'cpu',
		ops: 'ops',
		calls: 'calls',
		address: 'address',
		ram: 'ram',
		sourceName: 'source-name',
		source: 'source',
		debugContainer: 'debug-container',
		debug: 'debug'
	}
	for (var i in this.dom) this.dom[i] = document.getElementById(this.dom[i])
}
