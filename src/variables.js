// Variables: $(rio:cue_playhead_name), $(rio:clock_1), $(rio:timeline_remaining)…
// Per-item variables (layers, stopwatches, texts, audio strips) follow the show.

const fmt = (s) => {
	if (s === null || s === undefined || !isFinite(s)) return ''
	const neg = s < 0
	s = Math.abs(Math.floor(s))
	const h = Math.floor(s / 3600)
	const m = Math.floor((s % 3600) / 60)
	const sec = s % 60
	const p2 = (n) => String(n).padStart(2, '0')
	return (neg ? '-' : '') + (h ? `${h}:${p2(m)}:${p2(sec)}` : `${m}:${p2(sec)}`)
}
const pct = (v) => Math.round((Number(v) || 0) * 100)

function definitions(st) {
	const d = {
		connected: { name: 'Rio connected (true / false)' },
		session: { name: 'Session name' },
		rio_version: { name: 'Rio version' },
		cue_playhead_number: { name: 'Next GO: cue number' },
		cue_playhead_name: { name: 'Next GO: cue name' },
		cue_next_number: { name: 'Cue after the next GO: number' },
		cue_next_name: { name: 'Cue after the next GO: name' },
		cues_running: { name: 'Running cues (numbers)' },
		timeline_name: { name: 'Timeline: name' },
		timeline_time: { name: 'Timeline: position (m:ss)' },
		timeline_remaining: { name: 'Timeline: remaining (m:ss)' },
		timeline_state: { name: 'Timeline: state (playing, paused, hold, stopped)' },
		timeline_hold: { name: 'Timeline: name of the hold it waits on' },
		bpm: { name: 'Tempo (BPM)' },
		speed: { name: 'Global speed (×)' },
		master: { name: 'Image master (%)' },
		sound: { name: 'Sound master (%)' },
		deck: { name: 'Deck shown' },
		preview: { name: 'Preview: what waits in it (layer: clip, …)' },
		preview_count: { name: 'Preview: number of layers waiting' },
		blackout: { name: 'Blackout (on / off)' },
		ftb: { name: 'FTB (on / off)' },
		outputs: { name: 'Video outputs (on / off)' },
	}
	if (!st) return d
	for (const L of st.layers) {
		d[`layer_${L.n}_clip`] = { name: `Layer ${L.n} (${L.name}): clip playing` }
		d[`layer_${L.n}_remaining`] = { name: `Layer ${L.n} (${L.name}): time remaining` }
		d[`layer_${L.n}_opacity`] = { name: `Layer ${L.n} (${L.name}): opacity (%)` }
	}
	for (const c of st.clocks) {
		d[`clock_${c.n}`] = { name: `Stopwatch ${c.n} (${c.name}): value` }
		d[`clock_${c.n}_name`] = { name: `Stopwatch ${c.n}: name` }
	}
	for (const t of st.texts) {
		d[`text_${t.n}`] = { name: `Text source ${t.n} (${t.name}): current text` }
		d[`text_${t.n}_item`] = { name: `Text source ${t.n}: number of the current text` }
	}
	for (const b of st.audio.buses) d[`bus_${b.n}_volume`] = { name: `Audio bus ${b.n} (${b.name}): volume (%)` }
	for (const i of st.audio.inputs) d[`input_${i.n}_volume`] = { name: `Audio input ${i.n} (${i.name}): volume (%)` }
	d.pfl_volume = { name: 'PFL volume (%)' }
	return d
}

function UpdateVariableDefinitions(self) {
	self.setVariableDefinitions(definitions(self.state))
	UpdateVariableValues(self)
}

function UpdateVariableValues(self) {
	const st = self.state
	if (!st) {
		self.setVariableValues({ connected: false })
		return
	}
	const T = st.timeline
	const v = {
		connected: true,
		session: st.session,
		rio_version: st.rio,
		cue_playhead_number: st.go.playhead ? st.go.playhead.number : '',
		cue_playhead_name: st.go.playhead ? st.go.playhead.name : '',
		cue_next_number: st.go.next ? st.go.next.number : '',
		cue_next_name: st.go.next ? st.go.next.name : '',
		cues_running: st.go.running.join(' '),
		timeline_name: T ? T.name : '',
		timeline_time: T ? fmt(T.time) : '',
		timeline_remaining: T ? fmt(T.remaining) : '',
		timeline_state: !T ? 'stopped' : T.hold ? 'hold' : T.ended ? 'ended' : T.playing ? 'playing' : 'paused',
		timeline_hold: T ? T.holdName : '',
		bpm: Math.round((st.bpm || 0) * 10) / 10,
		speed: st.speed,
		master: pct(st.master),
		sound: pct(st.sound),
		deck: st.deck.name,
		pfl_volume: pct(st.audio.pfl.volume),
		preview: (st.preview || []).map((p) => `${p.name}: ${p.clip}`).join(', '),
		preview_count: (st.preview || []).length,
		blackout: st.blackout ? 'on' : 'off',
		ftb: st.ftb ? 'on' : 'off',
		outputs: st.outputs ? 'on' : 'off',
	}
	for (const L of st.layers) {
		v[`layer_${L.n}_clip`] = L.playing ? L.clip : ''
		v[`layer_${L.n}_remaining`] = L.playing && L.remaining !== null ? fmt(L.remaining) : ''
		v[`layer_${L.n}_opacity`] = pct(L.opacity)
	}
	for (const c of st.clocks) {
		v[`clock_${c.n}`] = c.text
		v[`clock_${c.n}_name`] = c.name
	}
	for (const t of st.texts) {
		v[`text_${t.n}`] = t.text
		v[`text_${t.n}_item`] = t.item
	}
	for (const b of st.audio.buses) v[`bus_${b.n}_volume`] = pct(b.volume)
	for (const i of st.audio.inputs) v[`input_${i.n}_volume`] = pct(i.volume)
	self.setVariableValues(v)
}

module.exports = { UpdateVariableDefinitions, UpdateVariableValues }
