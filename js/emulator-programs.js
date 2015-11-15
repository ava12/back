var BackEmulatorPrograms = {
	names: [
		'Hello world'
	],

	programs: [
		'0 "Hello world!"\n\\:: putc $ =(0) :end :put @(0) ? ^^\n\\:: put .> putc\n\\:: end'
	],

	get: function (name) {
		return this.programs[this.names.indexOf(name)]
	}
}