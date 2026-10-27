// Dropdown choices built from Rio's state (names shown, numbers sent).
// Before the first state arrives, plain numbers 1…16 are offered; every dropdown
// also accepts a typed value (allowCustom), so a button keeps working when the
// show changes.

const range = (n, label) => Array.from({ length: n }, (_, i) => ({ id: String(i + 1), label: `${label} ${i + 1}` }))

function choices(self) {
	const st = self.state
	const named = (list, label) =>
		list && list.length
			? list.map((x, i) => ({ id: String(x.n || i + 1), label: `${x.n || i + 1}. ${x.name}` }))
			: range(16, label)
	return {
		// cues of a group numbered as in Rio's list: 3.1, 3.2 (Rio 0.7.2)
		cues:
			st && st.cues.length
				? st.cues.map((c) => ({ id: c.number, label: `${c.child ? '  ↳ ' : ''}${c.number} — ${c.name}` }))
				: range(16, 'Cue'),
		// the playhead only stops on first-level cues
		topCues:
			st && st.cues.length
				? st.cues.filter((c) => !c.child).map((c) => ({ id: c.number, label: `${c.number} — ${c.name}` }))
				: range(16, 'Cue'),
		layers: named(st && st.layers, 'Layer'),
		columns:
			st && st.deck.columns.length
				? st.deck.columns.map((c, i) => ({ id: String(i + 1), label: `${i + 1}. ${c}` }))
				: range(16, 'Column'),
		timelines:
			st && st.timelines.length
				? st.timelines.map((t, i) => ({ id: String(i + 1), label: `${i + 1}. ${t}` }))
				: range(8, 'Timeline'),
		clocks: named(st && st.clocks, 'Stopwatch'),
		texts: named(st && st.texts, 'Text'),
		// Audio tab strips: 'master', 'pfl', 'bus:<n>' (bus 1 = Media), 'input:<n>'
		strips: [
			{ id: 'master', label: 'Master' },
			...(st ? st.audio.buses : [{ n: 1, name: 'Media' }]).map((b) => ({
				id: `bus:${b.n}`,
				label: `Bus ${b.n} — ${b.name}`,
			})),
			...(st ? st.audio.inputs : []).map((i) => ({ id: `input:${i.n}`, label: `Input ${i.n} — ${i.name}` })),
			{ id: 'pfl', label: 'PFL' },
		],
		// delay effects of the show (Rio 0.7 : audio.delays) — 'all' taps every delay
		delays: [
			{ id: 'all', label: 'All delays' },
			...(st && st.audio.delays
				? st.audio.delays.map((d) => ({ id: String(d.n), label: `${d.n}. ${d.name}` }))
				: range(8, 'Delay')),
		],
		// Rio 0.7.2: every audio effect (on / off), the auxes of SEND ON AUX, each video output
		effects: st && st.audio.effects ? named(st.audio.effects, 'Effect') : range(8, 'Effect'),
		auxes: st && st.audio.auxes ? named(st.audio.auxes, 'Aux') : range(4, 'Aux'),
		outputs: st && st.outputList ? named(st.outputList, 'Output') : range(4, 'Output'),
	}
}

/** '/rio/audio/...' prefix of a strip id. */
function stripPath(id) {
	const [k, n] = String(id || 'master').split(':')
	if (k === 'bus') return `/rio/audio/bus/${n}`
	if (k === 'input') return `/rio/audio/input/${n}`
	if (k === 'pfl') return '/rio/audio/pfl'
	return '/rio/audio/master'
}

/** State of a strip ({ volume, mute, pfl }) or null. */
function stripState(st, id) {
	if (!st) return null
	const [k, n] = String(id || 'master').split(':')
	if (k === 'bus') return st.audio.buses.find((b) => String(b.n) === String(n)) || null
	if (k === 'input') return st.audio.inputs.find((i) => String(i.n) === String(n)) || null
	if (k === 'pfl') return st.audio.pfl
	return st.audio.master
}

const ONOFF = [
	{ id: 'toggle', label: 'Toggle' },
	{ id: 'on', label: 'On' },
	{ id: 'off', label: 'Off' },
]

module.exports = { choices, stripPath, stripState, ONOFF }
