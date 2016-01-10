var BackEmulatorPrograms = {
	names: [
		'Hello world',
		'99 bottles',
		'Машина Тьюринга'
	],

	programs: [
		'0 "Hello world!"\n\\:: putc $ ?(:put :end) ^^\n\\:: put .> putc\n\\:: end',

		'\\= CntL 6\n\\= CntH 7\n\nmain\n\n\\% & \\\\(a, b) (a&b)\n  0 ?? .\n' +
		'\\: | \\\\(a, b) (a|b)\n  =(0) -1 @(0) ?? .\n\\: ~ \\\\(a) (~a)\n  0 -1 ?? .\n' +
		'\\% drop \\\\(a) ()\n  0 = .\n\\: xor \\\\(a, b) (a xor b)\n  $ =(0) ~ @(0) ?? .\n\n' +
		'\\: + \\\\(a, b) (a + b)\n  3= $ 2= 3@ xor\n  &(2@ 3@) << $\n  ?(:+ :+_exit) ^^\n' +
		'  \\:: +_exit\n  $ =\n.\n\n\\: ++ 1 + .\n\\: -- -1 + .\n\\: _ ~ ++ .\n\\: - _ + .\n\n' +
		'\\: print\n\\{\n  $ ?(:_put :_end) ^^\n  \\:: _put .> :print ^^\n  \\:: _end $ =\n\\} .\n\n' +
		'\\: print-cnt\n\\{\n  xor(@(CntH) "0") ?(:_tens :_check-zero) ^^\n  ' +
		'\\:: _tens @(CntH) .> _ones\n  \\:: _check-zero xor(@(CntL) "0") ?(:_ones :_no) ^^\n' +
		'  \\:: _no print(0 "no more bottles of beer") .\n  ' +
		'\\:: _ones @(CntL) $ .> print(0 " bottle")\n  -- @(CntH) xor ?(:_plural :_end) ^^\n\n' +
		'  \\:: _plural "s" .>\n  \\:: _end print(0 " of beer")\n\\} .\n\n\\: dec-cnt\n' +
		'\\{\n  @(CntL) -- $ =(CntL) xor(47) ?(:_end :_borrow) ^^\n' +
		'  \\:: _borrow "9" =(CntL) @(CntH) -- =(CntH)\n  \\:: _end\n\\} .\n\n\\:: main\n\n' +
		'"99" =(CntH) =(CntL)\n\n\\:: cycle\n' +
		'print-cnt print(0 " on the wall, ") print-cnt print(0 "Take one down and pass it around, " 10 ".")\n' +
		'dec-cnt\nprint-cnt print(0 10 " on the wall.")\n' +
		'+(@(CntH) @(CntL)) 96 - ?(:cycle :end) ^^\n\n\\:: end',

		'init\nmain\n\n\\= AllocPtr 7\n\\= FirstStatePtr 6\n\\= StatePtr 5\n\\= TapePos 4\n\n' +
		'\\= State.Name 0\n\\= State.FirstRulePtr 1\n\\= State.LastRulePtr 2\n\\= State.NextPtr 3\n' +
		'\\= StateSize 4\n\n\\= Rule.NextPtr 0\n\\= Rule.NewSymbol 1\n\\= Rule.Move 2\n' +
		'\\= Rule.NewStatePtr 3\n\\= Rule.Symbols 4\n\\= RuleSize 4\n\n\\= add-rule_StatePtr 8\n' +
		'\\= add-rule_RulePtr 9\n\n\\= find-state_Name 10\n\\= find-state_CurrentPtr 11\n\n' +
		'\\= alloc_CurrentPtr 12\n\n\\= read-rule_RulePtr 13\n\\= read-rule_Separator 14\n\n' +
		'\\= find-rule_Symbol 15\n\\= find-rule_RulePtr 16\n\n\\= FirstAllocAddr 32\n\n' +
		'\\:: end0 $ =\n\\:: end .\n\n\\% & \\* (a, b) (a&b) *\\ 0 ?? .\n' +
		'\\: | \\* (a, b) (a|b) *\\ =(0) -1 @(0) ?? .\n\\: ~ \\* (a) (~a) *\\ 0 -1 ?? .\n' +
		'\\% drop \\* (a) () *\\ 0 = .\n\\: xor \\* (a, b) (a xor b) *\\ $ =(0) ~ @(0) ?? .\n\n' +
		'\\: + \\\\(a, b) (a + b)\n  2= $ 1= 2@ xor\n  &(1@ 2@) << $\n  ?(:+ :end0) ^^\n.\n\n' +
		'\\: ++ 1 + .\n\\: -- -1 + .\n\\: _ ~ ++ .\n\\: - _ + .\n\n\\: swap \\\\ (a b) (b a)\n' +
		'  =(0) =(1) @(0) @(1)\n.\n\n\n\\: init\n  FirstAllocAddr =(AllocPtr)\n.\n\n\\: print\n\\{\n' +
		'  $ ?(:_put :end0) ^^\n  \\:: _put .> :print ^^\n\\} .\n\n\\: alloc \\\\ (размер) (адрес)\n' +
		'\\{\n  @(AllocPtr) $ =(alloc_CurrentPtr)\n  + $ =(AllocPtr)\n  &(0x8000) ?(:_error :_end) ^^\n' +
		'\\:: _error\n  print(0 "Переполнение кучи") !! \\\\ а вдруг?\n\\:: _end\n' +
		'  @(alloc_CurrentPtr)\n\\} .\n\n\\: alloc-state \\\\ () (адрес)\n  alloc(StateSize)\n.\n\n' +
		'\\: alloc-rule \\\\ () (адрес)\n  alloc(RuleSize)\n.\n\n\n' +
		'\\: find-state \\\\ (имя) (адрес)\n\\{\n  $ ?(:_find :end) ^^\n\n\\:: _find\n' +
		'  =(find-state_Name)\n  @(FirstStatePtr)\n  $ ?(:_check :_first) ^^\n\n\\:: _first \\\\ (0)\n' +
		'  $ =\n  @(:find-state_Name) alloc-state $ =(FirstStatePtr) =(+(State.Name)) @(FirstStatePtr)\n' +
		'  .\n\n\\:: _check \\\\ (адрес)\n  $ =(find-state_CurrentPtr)\n' +
		'  $ @(+(State.Name)) xor (@(find-state_Name)) ?(:_next :end) ^^\n\n\\:: _next \\\\ (адрес)\n' +
		'  @(+(State.NextPtr))\n  $ ?(:_check :_none) ^^\n\n\\:: _none \\\\ (0)\n  $ =\n  alloc-state\n' +
		'  $ @(find-state_CurrentPtr) +(State.NextPtr) =\n  $ =(find-state_CurrentPtr)\n' +
		'  @(find-state_Name) @(find-state_CurrentPtr) +(State.Name) =\n\\} .\n\n\n' +
		'\\: fix-separator \\\\ (символ) (символ|0)\n\\{\n' +
		'  $ xor(@(read-rule_Separator)) ?(:end :_nul) ^^\n\n\\:: _nul\n  drop 0\n\\} .\n\n\n' +
		'\\: add-rule \\\\ (адрес состояния, адрес правила) ()\n\\{\n' +
		'  =(add-rule_RulePtr) $ =(add-rule_StatePtr)\n' +
		'  +(State.LastRulePtr) $ @ $ ?(:_append :_first) ^^\n\n' +
		'\\:: _append \\\\ (адрес указателя на последнее правило, указатель на последнее правило)\n' +
		'  +(Rule.NextPtr) @(add-rule_RulePtr) swap =\n  @(add-rule_RulePtr) swap = .\n\n' +
		'\\:: _first \\\\ (адрес указателя на последнее правило, указатель на последнее правило)\n' +
		'  drop @(add-rule_RulePtr) swap =\n' +
		'  @(add-rule_RulePtr) =(@(add-rule_StatePtr) +(State.FirstRulePtr))\n\\} .\n\n\n' +
		'\\: read-symbols \\\\ (адрес буфера) ()\n\\{\n  $ .< fix-separator\n' +
		'  $ ?(:_read :_end) ^^\n\n\\:: _read \\\\ (текущий адрес, текущий адрес, символ)\n' +
		'  swap = ++ :read-symbols ^^\n\n\\:: _end\n  drop drop\n  ++ =(AllocPtr)\n\\} .\n\n\n' +
		'\\: read-rule \\\\ (имя) ()\n\\{\n  find-state \\\\ (адрес состояния)\n' +
		'  alloc-rule $ =(read-rule_RulePtr) \\\\ (адрес состояния, адрес правила)\n  add-rule \\\\ ()\n' +
		'  .< =(read-rule_Separator) \\\\ ()\n  @(read-rule_RulePtr)\n  $ +(Rule.Symbols) read-symbols\n' +
		'  $ .< fix-separator swap +(Rule.NewSymbol) =\n' +
		'  $ .< fix-separator find-state swap +(Rule.NewStatePtr) = $\n' +
		'  .< $ xor("+") ?(:_not-forward :_forward) ^^\n\n\\:: _forward \\\\ (адрес правила, символ)\n' +
		'  drop 1 _move\n\n\\:: _not-forward \\\\ (адрес правила, символ)\n  xor("-") ?(0 -1)\n\n' +
		'\\:: _move \\\\ (адрес правила, направление)\n  swap +(Rule.Move) =\n  drop\n\n\\:: _find-end\n' +
		'  .< xor(10) ?(:_find-end :end) ^^\n\\} .\n\n\\: read-rules\n\\{\n' +
		'  .< $ xor(10) ?(:_read :_end) ^^\n\n\\:: _read\n  read-rule :read-rules ^^\n\n\\:: _end\n' +
		'  drop\n  @(FirstStatePtr) =(StatePtr)\n\\} .\n\n\n\\: read-tape\n\\{\n' +
		'  0x8000 $ =(TapePos) $ " " swap =\n\n\\:: _cycle\n  $ .< $ ?(:_read :_end) ^^\n\n' +
		'\\:: _read \\\\ (адрес, адрес, символ)\n  swap = ++\n  _cycle\n\n' +
		'\\:: _end \\\\ (адрес, адрес, 0)\n  = drop\n\\} .\n\n\n' +
		'\\: find-rule \\\\ (символ) (адрес правила)\n\\{\n  =(find-rule_Symbol)\n' +
		'  @(StatePtr) +(State.FirstRulePtr) @\n\n\\:: _cycle\n  $ =(find-rule_RulePtr)\n' +
		'  $ ?(:_check :_error) ^^\n\n\\:: _check\n  +(Rule.Symbols)\n\n\\:: _check-cycle\n  $ @\n' +
		'  $ ?(:_compare :_next) ^^\n\n\\:: _compare\n' +
		'  xor(@(find-rule_Symbol)) ?(:_next-symbol :_end) ^^\n\n\\:: _next-symbol\n' +
		'  ++ _check-cycle\n\n\\:: _next\n  $ = drop\n' +
		'  @(find-rule_RulePtr) +(Rule.NextPtr) @ _cycle\n\n\\:: _error\n' +
		'  print(0 "Не найдено правило") $ = !!\n\n\\:: _end\n  drop @(find-rule_RulePtr)\n\\} .\n\n\n' +
		'\\: move-head \\\\ (направление) ()\n\\{\n  $ ?(:_move :_end) ^^\n\n\\:: _move\n' +
		'  @(TapePos) + |(0x8000) $ =(TapePos)\n  $ @ ?(:_end :_fix) ^^\n\n\\:: _fix\n' +
		'  " " swap = .\n\n\\:: _end\n  drop\n\\} .\n\n\\: run\n\\{\n  StatePtr @ @ .>\n' +
		'  find-rule(@(@(TapePos)))\n  $ +(Rule.NewSymbol) @ $ ?(:_write :_skip) ^^\n\n\\:: _write\n' +
		'  @(TapePos) = _move\n\n\\:: _skip\n  $ =\n\n\\:: _move\n  $ +(Rule.Move) @ move-head\n' +
		'  +(Rule.NewStatePtr) @ $ ?(:_continue :end0) ^^\n\n\\:: _continue\n' +
		'  =(StatePtr) :run ^^\n\\}\n\n\\: print-tape\n\\{\n  print(0 10 "Лента:" 10)\n  0x8000\n\n' +
		'\\:: _head-cycle\n  $ @ ?(:_head-next :_print-cycle) ^^\n\\:: _head-next\n' +
		'  -- |(0x8000) _head-cycle\n\n\\:: _print-cycle\n  ++ |(0x8000) $ @ $ ?(:_print :_end) ^^\n' +
		'\\:: _print\n  .> _print-cycle\n\\:: _end\n  =\n\\} .\n\n' +
		'\\:: main\n\nread-rules\nread-tape\nrun\nprint-tape\n'
	],

	get: function (name) {
		return this.programs[this.names.indexOf(name)]
	}
}