BackEmulatorStorage = {
	storageKey: 'back-programs',
	keyPrefix: '\xa0',
	available: !!window.localStorage,

	name2key: function (name) {
		name = name.replace(/^\s+|\s+$/g, '')
		if (!name.length) throw 'пустое имя программы'
		return this.keyPrefix + name
	},

	key2name: function (key) {
		return key.substr(1)
	},

	isKey: function (k) {
		return k.charAt(0) == this.keyPrefix
	},

	list: function () {
		var data = localStorage.getItem(this.storageKey)
		if (!data) return {}
		else return JSON.parse(data)
	},

	listNames: function () {
		var list = this.list()
		var result = []
		for (var k in list) {
			if (this.isKey(k)) result.push(this.key2name(k))
		}
		return result
	},

	get: function (name) {
		return this.list()[this.name2key(name)]
	},

	save: function (list) {
		localStorage.setItem(this.storageKey, JSON.stringify(list))
	},

	add: function (name, body) {
		var list = this.list()
		var key = this.name2key(name)
		if (key in list) throw 'имя уже занято'

		list[key] = body
		this.save(list)
	},

	replace: function (oldName, name, body) {
		var list = this.list()
		delete list[this.name2key(oldName)]
		list[this.name2key(name)] = body
		this.save(list)
	},

	remove: function (name) {
		var list = this.list()
		var key = this.name2key(name)
		if (!(key in list)) return

		delete list[key]
		this.save(list)
	}
}
