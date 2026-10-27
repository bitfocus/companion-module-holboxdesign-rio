const { choices, stripState } = require('./choices')

const ORANGE = 0xf97948
const GREEN = 0x1f8a3e
const RED = 0xc0392b
const YELLOW = 0xc99a06
const BLUE = 0x1e5fb3
const BLACK = 0x000000
const WHITE = 0xffffff

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
	const layer = (n) => st() && st().layers.find((l) => String(l.n) === String(n))
	const bool = (name, defaultStyle, options, fn) => ({
		type: 'boolean',
		name,
		defaultStyle,
		options,
		callback: (fb) => !!(st() && fn(fb.options)),
	})

	self.setFeedbackDefinitions({
		connected: {
			type: 'boolean',
			name: 'Rio connected',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [],
			callback: () => !!st(),
		},
		cue_running: bool('Cue: running', { bgcolor: GREEN, color: WHITE }, [dd('cue', 'Cue number', C.cues)], (o) =>
			st().go.running.includes(String(o.cue)),
		),
		cue_playhead: bool(
			'Cue: is the next GO (playhead)',
			{ bgcolor: ORANGE, color: BLACK },
			[dd('cue', 'Cue number', C.cues)],
			(o) => {
				const p = st().go.playhead
				return !!p && p.number === String(o.cue)
			},
		),
		layer_playing: bool(
			'Layer: something is playing',
			{ bgcolor: GREEN, color: WHITE },
			[dd('layer', 'Layer', C.layers)],
			(o) => {
				const L = layer(o.layer)
				return !!(L && L.playing)
			},
		),
		clip_playing: bool(
			'Deck: this clip is playing (layer × column)',
			{ bgcolor: GREEN, color: WHITE },
			[dd('layer', 'Layer', C.layers), dd('column', 'Column', C.columns)],
			(o) => {
				const L = layer(o.layer)
				return !!(L && L.playing && String(L.column) === String(o.column))
			},
		),
		layer_mute: bool('Layer: muted (M)', { bgcolor: RED, color: WHITE }, [dd('layer', 'Layer', C.layers)], (o) => {
			const L = layer(o.layer)
			return !!(L && L.mute)
		}),
		layer_solo: bool('Layer: solo (S)', { bgcolor: YELLOW, color: BLACK }, [dd('layer', 'Layer', C.layers)], (o) => {
			const L = layer(o.layer)
			return !!(L && L.solo)
		}),
		timeline_playing: bool(
			'Timeline: playing',
			{ bgcolor: GREEN, color: WHITE },
			[],
			() => !!(st().timeline && st().timeline.playing && !st().timeline.hold),
		),
		timeline_hold: bool(
			'Timeline: waiting for VALIDATE',
			{ bgcolor: ORANGE, color: BLACK },
			[],
			() => !!(st().timeline && st().timeline.hold),
		),
		audio_mute: bool(
			'Audio: strip muted',
			{ bgcolor: RED, color: WHITE },
			[dd('strip', 'Strip', C.strips, 'master')],
			(o) => {
				const s = stripState(st(), o.strip)
				return !!(s && s.mute)
			},
		),
		audio_pfl: bool(
			'Audio: strip in PFL',
			{ bgcolor: YELLOW, color: BLACK },
			[
				dd(
					'strip',
					'Strip',
					C.strips.filter((s) => s.id !== 'pfl'),
					'bus:1',
				),
			],
			(o) => {
				const s = stripState(st(), o.strip)
				return !!(s && s.pfl)
			},
		),
		clock_running: bool(
			'Stopwatch: running',
			{ bgcolor: GREEN, color: WHITE },
			[dd('clock', 'Stopwatch source', C.clocks)],
			(o) => {
				const c = st().clocks.find((x) => String(x.n) === String(o.clock))
				return !!(c && c.running)
			},
		),
		clock_ended: bool(
			'Stopwatch: countdown finished',
			{ bgcolor: RED, color: WHITE },
			[dd('clock', 'Stopwatch source', C.clocks)],
			(o) => {
				const c = st().clocks.find((x) => String(x.n) === String(o.clock))
				return !!(c && c.ended)
			},
		),
		layer_live_only: bool(
			'Layer: live only (cues ignore it, Rio 0.7.2)',
			{ bgcolor: YELLOW, color: BLACK },
			[dd('layer', 'Layer', C.layers)],
			(o) => {
				const L = layer(o.layer)
				return !!(L && L.exclude)
			},
		),
		// ---- Preview (Rio 0.7: one entry per previewed layer)
		preview_any: bool(
			'Preview: something waits in the Preview',
			{ bgcolor: ORANGE, color: BLACK },
			[],
			() => !!(st().preview && st().preview.length),
		),
		preview_layer: bool(
			'Preview: something waits on this layer',
			{ bgcolor: ORANGE, color: BLACK },
			[dd('layer', 'Layer', C.layers)],
			(o) => !!(st().preview || []).some((p) => String(p.layer) === String(o.layer)),
		),
		preview_clip: bool(
			'Preview: this clip waits in the Preview (layer × column)',
			{ bgcolor: ORANGE, color: BLACK },
			[dd('layer', 'Layer', C.layers), dd('column', 'Column', C.columns)],
			(o) =>
				!!(st().preview || []).some(
					(p) => String(p.layer) === String(o.layer) && String(p.column) === String(o.column),
				),
		),
		audio_fx_on: bool(
			'Audio: effect on (Rio 0.7.2)',
			{ bgcolor: GREEN, color: WHITE },
			[dd('fx', 'Audio effect', C.effects)],
			(o) => {
				const x = (st().audio.effects || []).find((e) => String(e.n) === String(o.fx))
				return !!(x && x.on)
			},
		),
		output_open: bool(
			'Video outputs: this output is open (Rio 0.7.2)',
			{ bgcolor: BLUE, color: WHITE },
			[dd('output', 'Output', C.outputs)],
			(o) => {
				const x = (st().outputList || []).find((e) => String(e.n) === String(o.output))
				return !!(x && x.open)
			},
		),
		outputs_on: bool('Video outputs started', { bgcolor: BLUE, color: WHITE }, [], () => !!st().outputs),
		blackout: bool('Blackout on', { bgcolor: RED, color: WHITE }, [], () => !!st().blackout),
		ftb: bool('FTB on', { bgcolor: RED, color: WHITE }, [], () => !!st().ftb),
		paused: bool(
			'Cues / deck paused',
			{ bgcolor: ORANGE, color: BLACK },
			[
				{
					type: 'dropdown',
					id: 'what',
					label: 'What',
					default: 'cues',
					choices: [
						{ id: 'cues', label: 'What the cues play' },
						{ id: 'clips', label: 'What the deck plays' },
					],
				},
			],
			(o) => !!(st().paused && st().paused[o.what]),
		),
	})
}
