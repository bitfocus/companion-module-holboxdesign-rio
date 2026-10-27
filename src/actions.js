const { choices, stripPath, stripState, ONOFF } = require('./choices')

const pct = (v) => Math.max(0, Math.min(100, Number(v) || 0)) / 100
/** dB value for Rio's …/db addresses: at or below -60 dB = silence ('-inf'). */
const dbArg = (db) => (Number(db) <= -60 ? '-inf' : Math.round(Number(db) * 10) / 10)

module.exports = function (self) {
	const C = choices(self)
	const st = () => self.state
	const dd = (id, label, list, def) => ({
		type: 'dropdown',
		id,
		label,
		choices: list,
		default: def ?? (list[0] && list[0].id) ?? '1',
		allowCustom: true,
	})
	const num = (id, label, def, min, max, step = 1) => ({ type: 'number', id, label, default: def, min, max, step })
	const onoff = { type: 'dropdown', id: 'mode', label: 'Mode', choices: ONOFF, default: 'toggle' }
	const simple = (name, path) => ({ name, options: [], callback: () => self.send(path) })
	/** on / off / toggle from a known state, with a command that only toggles */
	const setToggle = (mode, isOn, path) => {
		if (mode === 'toggle' || (mode === 'on' && !isOn) || (mode === 'off' && isOn)) return self.send(path)
	}

	self.setActionDefinitions({
		// ---- GO
		go: simple('GO', '/rio/go'),
		goback: simple('GO back (previous cue)', '/rio/goback'),
		gonext: simple('GO next (skip to the next cue)', '/rio/gonext'),
		panic: simple('PANIC! (everything fades out; twice: cut)', '/rio/panic'),
		ftb: simple('FTB (fade to black, again to come back)', '/rio/ftb'),
		blackout: simple('Blackout (outputs to black, players keep running)', '/rio/blackout'),
		cue_fire: {
			name: 'Cue: fire',
			options: [dd('cue', 'Cue number', C.cues)],
			callback: (e) => self.send(`/rio/cue/${encodeURIComponent(e.options.cue)}`),
		},
		cue_stop: {
			name: 'Cue: stop',
			options: [dd('cue', 'Cue number', C.cues)],
			callback: (e) => self.send(`/rio/cue/${encodeURIComponent(e.options.cue)}/stop`),
		},
		cue_select: {
			name: 'Cue: put the playhead on it, nothing starts (Rio 0.7.2)',
			options: [dd('cue', 'Cue number', C.topCues)],
			callback: (e) => {
				self.needs('0.7.2', 'Cue: put the playhead on it')
				return self.send(`/rio/cue/${encodeURIComponent(e.options.cue)}/select`)
			},
		},
		cues_pause: {
			name: 'Cues: pause / resume what they play',
			options: [onoff],
			callback: (e) =>
				self.send('/rio/cues/pause', e.options.mode === 'toggle' ? undefined : e.options.mode === 'on' ? 1 : 0),
		},
		cues_restart: simple('Cues: what they play, from the start', '/rio/cues/restart'),

		// ---- deck
		column: {
			name: 'Deck: play a column',
			options: [dd('column', 'Column', C.columns)],
			callback: (e) => self.send(`/rio/column/${e.options.column}`),
		},
		clip: {
			name: 'Deck: play a clip (layer × column)',
			options: [
				dd('layer', 'Layer', C.layers),
				dd('column', 'Column', C.columns),
				{
					type: 'dropdown',
					id: 'when',
					label: 'When',
					default: 'now',
					choices: [
						{ id: 'now', label: 'Now' },
						{ id: 'next', label: 'At the next loop start (again: cancel, Rio 0.7.2)' },
					],
				},
			],
			callback: (e) => {
				if (e.options.when === 'next') self.needs('0.7.2', 'Deck: a clip at the next loop start')
				return self.send(
					`/rio/layer/${e.options.layer}/clip/${e.options.column}${e.options.when === 'next' ? '/next' : ''}`,
				)
			},
		},
		deck: {
			name: 'Deck: show deck n',
			options: [num('deck', 'Deck', 1, 1, 64)],
			callback: (e) => self.send(`/rio/deck/${e.options.deck}`),
		},
		clips_pause: {
			name: 'Deck: pause / resume what it plays',
			options: [onoff],
			callback: (e) =>
				self.send('/rio/clips/pause', e.options.mode === 'toggle' ? undefined : e.options.mode === 'on' ? 1 : 0),
		},
		clips_restart: simple('Deck: what it plays, from the start', '/rio/clips/restart'),
		preview_cut: simple('Preview: CUT (every layer of the Preview on air)', '/rio/preview/cut'),
		preview_fade: simple('Preview: FADE (every layer of the Preview on air, layer fade)', '/rio/preview/fade'),
		// Rio 0.7 : Preview à plusieurs couches
		preview_swap: {
			name: 'Preview: SWAP with what is on air (Rio 0.7)',
			options: [{ type: 'checkbox', id: 'fade', label: 'With the layer fade', default: false }],
			callback: (e) => self.send(e.options.fade ? '/rio/preview/swap/fade' : '/rio/preview/swap'),
		},
		preview_clear: simple('Preview: clear (Rio 0.7)', '/rio/preview/clear'),
		preview_clip: {
			name: 'Preview: add / remove a clip (layer × column, Rio 0.7)',
			options: [dd('layer', 'Layer', C.layers), dd('column', 'Column', C.columns)],
			callback: (e) => self.send(`/rio/layer/${e.options.layer}/preview/${e.options.column}`),
		},

		// ---- layers
		layer_clear: {
			name: 'Layer: clear',
			options: [dd('layer', 'Layer', C.layers)],
			callback: (e) => self.send(`/rio/layer/${e.options.layer}/clear`),
		},
		layer_mute: {
			name: 'Layer: mute (M)',
			options: [dd('layer', 'Layer', C.layers), onoff],
			callback: (e) => {
				const L = st() && st().layers.find((l) => String(l.n) === String(e.options.layer))
				return setToggle(e.options.mode, !!(L && L.mute), `/rio/layer/${e.options.layer}/mute`)
			},
		},
		layer_solo: {
			name: 'Layer: solo (S)',
			options: [dd('layer', 'Layer', C.layers), onoff],
			callback: (e) => {
				const L = st() && st().layers.find((l) => String(l.n) === String(e.options.layer))
				return setToggle(e.options.mode, !!(L && L.solo), `/rio/layer/${e.options.layer}/solo`)
			},
		},
		layer_fade: {
			name: 'Layer: fade (F)',
			options: [dd('layer', 'Layer', C.layers)],
			callback: (e) => self.send(`/rio/layer/${e.options.layer}/fade`),
		},
		layer_opacity: {
			name: 'Layer: opacity',
			options: [dd('layer', 'Layer', C.layers), num('value', 'Opacity (%)', 100, 0, 100)],
			callback: (e) => self.send(`/rio/layer/${e.options.layer}/opacity`, pct(e.options.value)),
		},
		layer_live_only: {
			name: 'Layer: live only (cues ignore it)',
			options: [dd('layer', 'Layer', C.layers), onoff],
			callback: (e) =>
				self.send(
					`/rio/layer/${e.options.layer}/exclude`,
					e.options.mode === 'toggle' ? undefined : e.options.mode === 'on' ? 1 : 0,
				),
		},
		layer_speed: {
			name: 'Layer: speed of the clip playing',
			options: [dd('layer', 'Layer', C.layers), num('speed', 'Speed (×, 1 = normal)', 1, 0.125, 8, 0.05)],
			callback: (e) => self.send(`/rio/layer/${e.options.layer}/speed`, e.options.speed),
		},

		// ---- composition
		master: {
			name: 'Image: master level',
			options: [num('value', 'Level (%)', 100, 0, 100)],
			callback: (e) => self.send('/rio/master', pct(e.options.value)),
		},
		speed: {
			name: 'Global playback speed',
			options: [num('speed', 'Speed (×, 1 = normal)', 1, 0.125, 8, 0.05)],
			callback: (e) => self.send('/rio/speed', e.options.speed),
		},
		outputs: {
			name: 'Video outputs: start / stop',
			options: [onoff],
			callback: (e) => self.send(e.options.mode === 'toggle' ? '/rio/outputs' : `/rio/outputs/${e.options.mode}`),
		},
		output_one: {
			name: 'Video outputs: open / close one output (Rio 0.7.2)',
			options: [dd('output', 'Output', C.outputs), onoff],
			callback: (e) => {
				self.needs('0.7.2', 'Video outputs: one output')
				return self.send(
					`/rio/output/${e.options.output}`,
					e.options.mode === 'toggle' ? undefined : e.options.mode === 'on' ? 1 : 0,
				)
			},
		},

		// ---- audio tab
		audio_volume: {
			name: 'Audio: volume of a strip',
			description:
				'Up to 200 % (+6 dB) on buses, inputs and the PFL (Rio 0.7.2 above 100 %); the Master stops at 100 %.',
			options: [dd('strip', 'Strip', C.strips, 'master'), num('value', 'Volume (%)', 100, 0, 200)],
			callback: (e) => {
				const v = Math.max(0, Math.min(200, Number(e.options.value) || 0))
				if (v <= 100)
					return self.send(
						e.options.strip === 'master' ? '/rio/audio/master' : `${stripPath(e.options.strip)}/volume`,
						v / 100,
					)
				// above 0 dB: in dB (0…1 and 0…127 cannot go higher)
				self.needs('0.7.2', 'Audio: volume above 100 %')
				return self.send(`${stripPath(e.options.strip)}/db`, dbArg(20 * Math.log10(v / 100)))
			},
		},
		audio_volume_db: {
			name: 'Audio: volume of a strip in dB (Rio 0.7.2)',
			options: [dd('strip', 'Strip', C.strips, 'master'), num('db', 'Volume (dB, -60 = silence)', 0, -60, 6, 0.5)],
			callback: (e) => {
				self.needs('0.7.2', 'Audio: volume in dB')
				return self.send(`${stripPath(e.options.strip)}/db`, dbArg(e.options.db))
			},
		},
		audio_send: {
			name: 'Audio: send level to an aux (SEND ON AUX, Rio 0.7.2)',
			description: 'Aux = a bus or the PFL, in the order of Rio (the buses, then the PFL).',
			options: [
				dd(
					'strip',
					'From strip',
					C.strips.filter((s) => s.id !== 'pfl'),
					'bus:1',
				),
				dd('aux', 'To aux', C.auxes),
				num('db', 'Send level (dB, -60 = off)', 0, -60, 6, 0.5),
			],
			callback: (e) => {
				self.needs('0.7.2', 'Audio: send to an aux')
				return self.send(`${stripPath(e.options.strip)}/send/${e.options.aux}/db`, dbArg(e.options.db))
			},
		},
		audio_fx: {
			name: 'Audio: effect on / off (Rio 0.7.2)',
			options: [dd('fx', 'Audio effect', C.effects), onoff],
			callback: (e) => {
				self.needs('0.7.2', 'Audio: effect on / off')
				return self.send(
					`/rio/audio/fx/${e.options.fx}`,
					e.options.mode === 'toggle' ? undefined : e.options.mode === 'on' ? 1 : 0,
				)
			},
		},
		audio_mute: {
			name: 'Audio: mute a strip',
			options: [dd('strip', 'Strip', C.strips, 'master'), onoff],
			callback: (e) => {
				const s = stripState(st(), e.options.strip)
				const v = e.options.mode === 'toggle' ? undefined : e.options.mode === 'on' ? 1 : 0
				if (v !== undefined && s && !!s.mute === (v === 1)) return
				return self.send(`${stripPath(e.options.strip)}/mute`, v)
			},
		},
		audio_pfl: {
			name: 'Audio: PFL of a strip (listen before its fader)',
			options: [
				dd(
					'strip',
					'Strip',
					C.strips.filter((s) => s.id !== 'pfl'),
					'bus:1',
				),
				onoff,
			],
			callback: (e) =>
				self.send(
					`${stripPath(e.options.strip)}/pfl`,
					e.options.mode === 'toggle' ? undefined : e.options.mode === 'on' ? 1 : 0,
				),
		},
		// Rio 0.7 : tap tempo des delays (press the button in rhythm, the delay time follows)
		audio_delay_tap: {
			name: 'Audio: delay tap tempo (Rio 0.7)',
			options: [dd('delay', 'Delay', C.delays, 'all')],
			callback: (e) =>
				self.send(e.options.delay === 'all' ? '/rio/audio/delay/tap' : `/rio/audio/delay/${e.options.delay}/tap`),
		},

		// ---- timeline
		tl_play: simple('Timeline: play', '/rio/timeline/play'),
		tl_pause: simple('Timeline: pause', '/rio/timeline/pause'),
		tl_stop: simple('Timeline: stop', '/rio/timeline/stop'),
		tl_continue: simple('Timeline: VALIDATE the hold', '/rio/timeline/continue'),
		tl_switch: simple('Timeline: switch to normal (the deck takes over)', '/rio/timeline/switch'),
		tl_select_play: {
			name: 'Timeline: select and play timeline n',
			options: [dd('tl', 'Timeline', C.timelines)],
			callback: (e) => self.send(`/rio/timeline/${e.options.tl}/play`),
		},
		tl_take: {
			name: 'Timeline: switch from the deck to timeline n (live, no cut)',
			options: [dd('tl', 'Timeline', C.timelines), num('from', 'From (seconds)', 0, 0, 86400)],
			callback: (e) => self.send(`/rio/timeline/${e.options.tl}/take`, e.options.from || undefined),
		},
		tl_seek: {
			name: 'Timeline: go to a second',
			options: [num('t', 'Time (seconds)', 0, 0, 86400, 0.1)],
			callback: (e) => self.send('/rio/timeline/seek', e.options.t),
		},
		encart: {
			name: 'Director view: inset message',
			options: [{ type: 'textinput', id: 'text', label: 'Message (empty = clear)', default: '' }],
			callback: (e) =>
				String(e.options.text || '').trim()
					? self.send('/rio/encart', String(e.options.text))
					: self.send('/rio/encart/clear'),
		},

		// ---- sources
		clock: {
			name: 'Stopwatch: start / pause / reset',
			options: [
				dd('clock', 'Stopwatch source', C.clocks),
				{
					type: 'dropdown',
					id: 'cmd',
					label: 'Command',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Start / pause' },
						{ id: 'start', label: 'Start' },
						{ id: 'pause', label: 'Pause' },
						{ id: 'reset', label: 'Reset' },
						{ id: 'restart', label: 'Restart from zero' },
					],
				},
			],
			callback: (e) => self.send(`/rio/clock/${e.options.clock}/${e.options.cmd}`),
		},
		text_step: {
			name: 'Text source: next / previous text',
			options: [
				dd('text', 'Text source', C.texts),
				{
					type: 'dropdown',
					id: 'dir',
					label: 'Direction',
					default: 'next',
					choices: [
						{ id: 'next', label: 'Next' },
						{ id: 'prev', label: 'Previous' },
					],
				},
			],
			callback: (e) => self.send(`/rio/text/${e.options.text}/${e.options.dir}`),
		},
		text_item: {
			name: 'Text source: show text k',
			options: [dd('text', 'Text source', C.texts), num('item', 'Text number', 1, 1, 999)],
			callback: (e) => self.send(`/rio/text/${e.options.text}/item/${e.options.item}`),
		},
		pdf: {
			name: 'PDF on screen: page',
			options: [
				{
					type: 'dropdown',
					id: 'cmd',
					label: 'Page',
					default: 'next',
					choices: [
						{ id: 'next', label: 'Next' },
						{ id: 'prev', label: 'Previous' },
						{ id: 'first', label: 'First' },
						{ id: 'last', label: 'Last' },
						{ id: 'page', label: 'Page number…' },
					],
				},
				{ ...num('page', 'Page number', 1, 1, 9999), isVisibleExpression: '$(options:cmd) == "page"' },
			],
			callback: (e) =>
				self.send(e.options.cmd === 'page' ? `/rio/pdf/page/${e.options.page}` : `/rio/pdf/${e.options.cmd}`),
		},

		// ---- tempo
		bpm_set: {
			name: 'Tempo: set BPM',
			options: [num('bpm', 'BPM', 120, 20, 300, 0.1)],
			callback: (e) => self.send('/rio/bpm', e.options.bpm),
		},
		bpm_tap: simple('Tempo: tap', '/rio/bpm/tap'),
		bpm_half: simple('Tempo: ÷2', '/rio/bpm/half'),
		bpm_double: simple('Tempo: ×2', '/rio/bpm/double'),
		bpm_resync: simple('Tempo: beat 1 now', '/rio/bpm/resync'),

		// ---- anything else
		custom: {
			name: 'Custom command (Rio address)',
			description: 'Any address of Rio’s OSC / HTTP API (Rio › Options › Companion), e.g. /rio/layer/2/clear',
			options: [
				{ type: 'textinput', id: 'path', label: 'Address', default: '/rio/go' },
				{ type: 'textinput', id: 'value', label: 'Value (optional)', default: '' },
			],
			callback: (e) => {
				let p = String(e.options.path || '').trim()
				if (!p.startsWith('/')) p = '/' + p
				if (!p.startsWith('/rio')) p = '/rio' + p
				return self.send(p, e.options.value === '' ? undefined : e.options.value)
			},
		},
	})
}
