// Ready-made buttons: show control, timeline, deck (one button per clip of the
// current deck), layers, audio desk, stopwatches. Built from the state of Rio, so
// they follow the show.

const ORANGE = 0xf97948
const GREEN = 0x1f8a3e
const RED = 0xc0392b
const YELLOW = 0xc99a06
const BLUE = 0x1e5fb3
const DARK = 0x1b1f26
const BLACK = 0x000000
const WHITE = 0xffffff

const btn = (name, text, actions, feedbacks = [], style = {}) => ({
	type: 'simple',
	name,
	style: { text, size: 'auto', color: WHITE, bgcolor: DARK, ...style },
	steps: [{ down: actions, up: [] }],
	feedbacks,
})
const act = (actionId, options = {}) => ({ actionId, options })
const fb = (feedbackId, options, style) => ({ feedbackId, options, style })

module.exports = function (self) {
	const st = self.state
	// variables of this connection: $(<connection name>:...)
	const v = (name) => `$(${self.label}:${name})`
	const presets = {}
	const sections = []
	const add = (list, id, def) => {
		presets[id] = def
		list.push(id)
	}

	// ---- show control
	const show = []
	add(show, 'go', btn('GO', 'GO\n' + v('cue_playhead_number'), [act('go')], [], { bgcolor: GREEN, size: '18' }))
	add(show, 'goback', btn('GO back', '◀\nBACK', [act('goback')]))
	add(show, 'gonext', btn('GO next', 'NEXT\n▶', [act('gonext')]))
	add(show, 'panic', btn('Panic', 'PANIC!', [act('panic')], [], { bgcolor: RED }))
	add(show, 'ftb', btn('FTB', 'FTB', [act('ftb')], [fb('ftb', {}, { bgcolor: RED })]))
	add(show, 'blackout', btn('Blackout', 'BLACK\nOUT', [act('blackout')], [fb('blackout', {}, { bgcolor: RED })]))
	add(
		show,
		'next_cue',
		btn('Next cue name', 'NEXT\n' + v('cue_playhead_name'), [], [], { size: '14', bgcolor: BLACK, color: ORANGE }),
	)
	add(
		show,
		'outputs',
		btn('Outputs', 'OUTPUTS', [act('outputs', { mode: 'toggle' })], [fb('outputs_on', {}, { bgcolor: BLUE })]),
	)
	add(
		show,
		'cues_pause',
		btn(
			'Cues: pause / resume',
			'⏸\nCUES',
			[act('cues_pause', { mode: 'toggle' })],
			[fb('paused', { what: 'cues' }, { bgcolor: ORANGE, color: BLACK })],
		),
	)
	add(show, 'cues_restart', btn('Cues: from the start', '⏮\nCUES', [act('cues_restart')]))
	add(
		show,
		'clips_pause',
		btn(
			'Deck: pause / resume',
			'⏸\nDECK',
			[act('clips_pause', { mode: 'toggle' })],
			[fb('paused', { what: 'clips' }, { bgcolor: ORANGE, color: BLACK })],
		),
	)
	add(show, 'clips_restart', btn('Deck: from the start', '⏮\nDECK', [act('clips_restart')]))
	sections.push({ id: 'show', name: 'Show control', definitions: show })

	// ---- Preview (Rio 0.7: several layers at once; SWAP = the Preview on air, what played back in the Preview)
	const pv = []
	const pvOn = [fb('preview_any', {}, { bgcolor: ORANGE, color: BLACK })]
	add(pv, 'pv_cut', btn('Preview CUT', 'CUT', [act('preview_cut')], pvOn, { size: '18' }))
	add(pv, 'pv_fade', btn('Preview FADE', 'FADE', [act('preview_fade')], pvOn, { size: '18' }))
	add(pv, 'pv_swap', btn('Preview SWAP', '⇄\nSWAP', [act('preview_swap', { fade: false })], pvOn))
	add(pv, 'pv_swap_fade', btn('Preview SWAP with fade', '⇄ SWAP\nFADE', [act('preview_swap', { fade: true })], pvOn))
	add(pv, 'pv_clear', btn('Preview: clear', '✕\nPREVIEW', [act('preview_clear')], pvOn))
	add(
		pv,
		'pv_show',
		btn('Preview: what waits in it', 'PREVIEW\n' + v('preview'), [], [], { size: '7', bgcolor: BLACK, color: ORANGE }),
	)
	if (st && st.layers.length && st.deck.columns.length) {
		for (const L of [...st.layers].reverse()) {
			st.deck.columns.forEach((c, i) => {
				const o = { layer: String(L.n), column: String(i + 1) }
				add(
					pv,
					`pv_clip_${L.n}_${i + 1}`,
					btn(
						`Preview ${L.name} × ${c}`,
						`PV\n${L.name}\n${c}`,
						[act('preview_clip', o)],
						[fb('preview_clip', o, { bgcolor: ORANGE, color: BLACK })],
						{
							size: '7',
						},
					),
				)
			})
		}
	}
	sections.push({ id: 'preview', name: 'Preview', definitions: pv })

	// ---- timeline
	const tl = []
	add(tl, 'tl_play', btn('Timeline play', 'TL\n▶', [act('tl_play')], [fb('timeline_playing', {}, { bgcolor: GREEN })]))
	add(tl, 'tl_pause', btn('Timeline pause', 'TL\n❚❚', [act('tl_pause')]))
	add(tl, 'tl_stop', btn('Timeline stop', 'TL\n■', [act('tl_stop')]))
	add(
		tl,
		'tl_validate',
		btn(
			'Validate the hold',
			'VALIDATE\n' + v('timeline_hold'),
			[act('tl_continue')],
			[fb('timeline_hold', {}, { bgcolor: ORANGE, color: BLACK })],
			{ size: '14' },
		),
	)
	add(
		tl,
		'tl_time',
		btn('Timeline remaining', v('timeline_name') + '\n-' + v('timeline_remaining'), [], [], {
			size: '14',
			bgcolor: BLACK,
		}),
	)
	add(tl, 'tl_switch', btn('Back to the deck', 'TO\nDECK', [act('tl_switch')]))
	sections.push({ id: 'timeline', name: 'Timeline', definitions: tl })

	// ---- deck: one button per clip of the deck shown in Rio
	if (st && st.layers.length && st.deck.columns.length) {
		const deck = []
		for (const L of [...st.layers].reverse()) {
			st.deck.columns.forEach((c, i) => {
				const o = { layer: String(L.n), column: String(i + 1) }
				add(
					deck,
					`clip_${L.n}_${i + 1}`,
					btn(`${L.name} × ${c}`, `${L.name}\n${c}`, [act('clip', o)], [fb('clip_playing', o, { bgcolor: GREEN })], {
						size: '14',
					}),
				)
			})
		}
		st.deck.columns.forEach((c, i) => {
			add(
				deck,
				`column_${i + 1}`,
				btn(`Column ${c}`, `▶ ${c}`, [act('column', { column: String(i + 1) })], [], {
					bgcolor: ORANGE,
					color: BLACK,
					size: '14',
				}),
			)
		})
		sections.push({ id: 'deck', name: `Deck — ${st.deck.name}`, definitions: deck })
	}

	// ---- layers
	if (st && st.layers.length) {
		const lay = []
		for (const L of st.layers) {
			const o = { layer: String(L.n) }
			add(
				lay,
				`layer_mute_${L.n}`,
				btn(
					`Mute ${L.name}`,
					`M\n${L.name}`,
					[act('layer_mute', { ...o, mode: 'toggle' })],
					[fb('layer_mute', o, { bgcolor: RED })],
					{ size: '14' },
				),
			)
			add(
				lay,
				`layer_clear_${L.n}`,
				btn(`Clear ${L.name}`, `✕\n${L.name}`, [act('layer_clear', o)], [fb('layer_playing', o, { bgcolor: GREEN })], {
					size: '14',
				}),
			)
			add(
				lay,
				`layer_solo_${L.n}`,
				btn(
					`Solo ${L.name}`,
					`S\n${L.name}`,
					[act('layer_solo', { ...o, mode: 'toggle' })],
					[fb('layer_solo', o, { bgcolor: YELLOW, color: BLACK })],
					{ size: '14' },
				),
			)
			add(lay, `layer_fade_${L.n}`, btn(`Fade ${L.name}`, `F\n${L.name}`, [act('layer_fade', o)], [], { size: '14' }))
			add(
				lay,
				`layer_live_${L.n}`,
				btn(
					`Live only ${L.name}`,
					`⊘ LIVE\n${L.name}`,
					[act('layer_live_only', { ...o, mode: 'toggle' })],
					[fb('layer_live_only', o, { bgcolor: YELLOW, color: BLACK })],
					{ size: '14' },
				),
			)
		}
		sections.push({ id: 'layers', name: 'Layers', definitions: lay })
	}

	// ---- audio desk
	const audio = []
	const strips = [{ id: 'master', name: 'Master' }]
	if (st) {
		st.audio.buses.forEach((b) => strips.push({ id: `bus:${b.n}`, name: b.name }))
		st.audio.inputs.forEach((i) => strips.push({ id: `input:${i.n}`, name: i.name }))
	}
	for (const s of strips) {
		const k = s.id.replace(':', '_')
		add(
			audio,
			`mute_${k}`,
			btn(
				`Mute ${s.name}`,
				`MUTE\n${s.name}`,
				[act('audio_mute', { strip: s.id, mode: 'toggle' })],
				[fb('audio_mute', { strip: s.id }, { bgcolor: RED })],
				{ size: '14' },
			),
		)
		add(
			audio,
			`pfl_${k}`,
			btn(
				`PFL ${s.name}`,
				`PFL\n${s.name}`,
				[act('audio_pfl', { strip: s.id, mode: 'toggle' })],
				[fb('audio_pfl', { strip: s.id }, { bgcolor: YELLOW, color: BLACK })],
				{ size: '14' },
			),
		)
	}
	// delays: TAP in rhythm (Rio 0.7); every audio effect: on / off (Rio 0.7.2)
	if (st && st.audio.delays && st.audio.delays.length) {
		add(audio, 'delay_tap_all', btn('TAP every delay', 'TAP\nDELAYS', [act('audio_delay_tap', { delay: 'all' })]))
		for (const d of st.audio.delays)
			add(
				audio,
				`delay_tap_${d.n}`,
				btn(`TAP ${d.name}`, `TAP\n${d.name}`, [act('audio_delay_tap', { delay: String(d.n) })], [], { size: '7' }),
			)
	}
	if (st && st.audio.effects)
		for (const x of st.audio.effects) {
			const o = { fx: String(x.n) }
			add(
				audio,
				`fx_${x.n}`,
				btn(
					`Effect ${x.name}: on / off`,
					`FX\n${x.name}`,
					[act('audio_fx', { ...o, mode: 'toggle' })],
					[fb('audio_fx_on', o, { bgcolor: GREEN })],
					{
						size: '7',
					},
				),
			)
		}
	sections.push({ id: 'audio', name: 'Audio desk', definitions: audio })

	// ---- tempo
	const tempo = []
	add(tempo, 'bpm_show', btn('Tempo', v('bpm') + '\nBPM', [], [], { size: '14', bgcolor: BLACK }))
	add(tempo, 'bpm_tap', btn('Tempo: tap', 'TAP', [act('bpm_tap')], [], { size: '18' }))
	add(tempo, 'bpm_half', btn('Tempo: ÷2', 'BPM\n÷2', [act('bpm_half')]))
	add(tempo, 'bpm_double', btn('Tempo: ×2', 'BPM\n×2', [act('bpm_double')]))
	add(tempo, 'bpm_resync', btn('Tempo: beat 1 now', '⟲\nBEAT 1', [act('bpm_resync')]))
	sections.push({ id: 'tempo', name: 'Tempo', definitions: tempo })

	// ---- video outputs, one by one (Rio 0.7.2)
	if (st && st.outputList && st.outputList.length) {
		const outs = []
		for (const o of st.outputList) {
			const opt = { output: String(o.n) }
			add(
				outs,
				`output_${o.n}`,
				btn(
					`Output ${o.name}`,
					`OUT\n${o.name}`,
					[act('output_one', { ...opt, mode: 'toggle' })],
					[fb('output_open', opt, { bgcolor: BLUE })],
					{
						size: '14',
					},
				),
			)
		}
		sections.push({ id: 'outputs', name: 'Video outputs', definitions: outs })
	}

	// ---- texts and PDF
	const txt = []
	if (st && st.texts.length)
		for (const t of st.texts) {
			const o = { text: String(t.n) }
			add(
				txt,
				`text_prev_${t.n}`,
				btn(`${t.name}: previous text`, `◀\n${t.name}`, [act('text_step', { ...o, dir: 'prev' })], [], { size: '14' }),
			)
			add(
				txt,
				`text_next_${t.n}`,
				btn(`${t.name}: next text`, `${t.name}\n▶`, [act('text_step', { ...o, dir: 'next' })], [], { size: '14' }),
			)
		}
	add(txt, 'pdf_prev', btn('PDF: previous page', 'PDF\n◀', [act('pdf', { cmd: 'prev' })]))
	add(txt, 'pdf_next', btn('PDF: next page', 'PDF\n▶', [act('pdf', { cmd: 'next' })]))
	sections.push({ id: 'texts', name: 'Texts and PDF', definitions: txt })

	// ---- stopwatches
	if (st && st.clocks.length) {
		const cl = []
		for (const c of st.clocks) {
			const o = { clock: String(c.n) }
			add(
				cl,
				`clock_${c.n}`,
				btn(
					`Stopwatch ${c.name}: start / pause`,
					v(`clock_${c.n}`),
					[act('clock', { ...o, cmd: 'toggle' })],
					[fb('clock_running', o, { bgcolor: GREEN }), fb('clock_ended', o, { bgcolor: RED })],
					{
						size: '18',
					},
				),
			)
			add(
				cl,
				`clock_reset_${c.n}`,
				btn(`Stopwatch ${c.name}: reset`, `↺\n${c.name}`, [act('clock', { ...o, cmd: 'reset' })], [], { size: '14' }),
			)
		}
		sections.push({ id: 'clocks', name: 'Stopwatches', definitions: cl })
	}

	self.setPresetDefinitions(sections, presets)
}
