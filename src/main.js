// Holbox Design Rio — Bitfocus Companion module.
//
// Commands: HTTP GET http://<rio>:<port>/rio/... (Rio › Options › Connections › HTTP,
// port 7001 by default) — the same addresses as Rio's OSC API, value in ?v=.
// State: GET /rio/status (JSON) polled a few times per second, for the button
// feedbacks and the variables. HTTP (TCP) rather than OSC (UDP): an unreachable Rio
// shows up as a red connection instead of commands silently lost.

const { InstanceBase, InstanceStatus, Regex } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const { UpdateVariableDefinitions, UpdateVariableValues } = require('./variables')
const UpdatePresets = require('./presets')

/** 'a.b.c' version strings compared: <0, 0, >0 */
function cmpVersion(a, b) {
	const pa = String(a || '0')
		.split('.')
		.map((x) => parseInt(x, 10) || 0)
	const pb = String(b || '0')
		.split('.')
		.map((x) => parseInt(x, 10) || 0)
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const d = (pa[i] || 0) - (pb[i] || 0)
		if (d) return d
	}
	return 0
}

class RioInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.state = null
		this.layoutSig = ''
		this.pollTimer = null
		this.polling = false
		this.failures = 0
		this.destroyed = false
		this.statusSig = ''
		this.warned = new Set()
	}

	async init(config) {
		this.config = config
		this.setStatus(InstanceStatus.Connecting)
		this.updateDefinitions()
		this.startPolling()
	}

	async destroy() {
		this.destroyed = true
		this.stopPolling()
	}

	async configUpdated(config) {
		this.config = config
		this.stopPolling()
		this.state = null
		this.layoutSig = ''
		this.setStatus(InstanceStatus.Connecting)
		this.startPolling()
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Rio',
				value:
					'In Rio: Options › Connections › HTTP. Use the IP address shown there and the HTTP port (7001 by default). Rio 0.6 or later; Rio 0.7.2 or later for every action.',
			},
			{ type: 'textinput', id: 'host', label: 'Rio IP address', width: 8, default: '127.0.0.1', regex: Regex.IP },
			{ type: 'textinput', id: 'port', label: 'HTTP port', width: 4, default: '7001', regex: Regex.PORT },
			{
				type: 'number',
				id: 'poll',
				label: 'State refresh (ms)',
				width: 4,
				default: 250,
				min: 100,
				max: 5000,
			},
		]
	}

	/** Connection status, sent to Companion only when it changes. */
	setStatus(status, message) {
		const sig = `${status}|${message || ''}`
		if (sig === this.statusSig) return
		this.statusSig = sig
		this.updateStatus(status, message)
	}

	/** An action of a newer Rio: warns once in the log when the connected Rio is older. */
	needs(version, what) {
		const v = this.state && this.state.rio
		if (!v || cmpVersion(v, version) >= 0 || this.warned.has(what)) return
		this.warned.add(what)
		this.log('warn', `${what} needs Rio ${version} or later (connected: Rio ${v}): update Rio.`)
	}

	baseUrl() {
		const host = (this.config && this.config.host) || '127.0.0.1'
		const port = (this.config && this.config.port) || '7001'
		return `http://${host}:${port}`
	}

	/** Sends a Rio command: path like '/rio/go', optional value (number or text). */
	async send(path, value) {
		if (this.destroyed) return
		const url =
			this.baseUrl() +
			path +
			(value !== undefined && value !== null && value !== '' ? `?v=${encodeURIComponent(value)}` : '')
		try {
			const r = await fetch(url, { signal: AbortSignal.timeout(2000) })
			if (!r.ok) this.log('warn', `Rio answered ${r.status} to ${path}`)
		} catch (e) {
			if (this.destroyed) return
			this.log('error', `Rio not reachable (${path}): ${e.message}`)
			this.setStatus(InstanceStatus.ConnectionFailure, 'Rio not reachable')
		}
		// state right after a command, so the buttons follow at once
		if (!this.destroyed) setTimeout(() => this.poll(), 80)
	}

	startPolling() {
		this.stopPolling()
		if (this.destroyed) return
		const ms = Math.max(100, Number(this.config && this.config.poll) || 250)
		this.pollTimer = setInterval(() => this.poll(), ms)
		this.poll()
	}

	stopPolling() {
		if (this.pollTimer) clearInterval(this.pollTimer)
		this.pollTimer = null
	}

	async poll() {
		if (this.polling || this.destroyed) return
		this.polling = true
		try {
			const r = await fetch(this.baseUrl() + '/rio/status', { signal: AbortSignal.timeout(1500) })
			const text = await r.text()
			if (this.destroyed) return
			let st
			try {
				st = JSON.parse(text)
			} catch (e) {
				st = null
			}
			if (!st || typeof st !== 'object' || !st.go) {
				this.setStatus(InstanceStatus.UnknownWarning, 'Rio answers but gives no state: update Rio to 0.6 or later')
				this.state = null
				return
			}
			this.failures = 0
			this.state = st
			this.setStatus(InstanceStatus.Ok)
			// cue list, layers, stopwatches, effects… changed: dropdowns and presets follow
			const names = (list) => (list || []).map((x) => x.name)
			const sig = JSON.stringify([
				st.cues.map((c) => [c.number, c.name]),
				st.layers.map((l) => l.name),
				st.deck.name,
				st.deck.columns,
				st.timelines,
				names(st.clocks),
				names(st.texts),
				names(st.audio.buses),
				names(st.audio.inputs),
				names(st.audio.delays),
				names(st.audio.effects),
				names(st.audio.auxes),
				names(st.outputList),
			])
			if (sig !== this.layoutSig) {
				this.layoutSig = sig
				this.updateDefinitions()
			}
			UpdateVariableValues(this)
			this.checkAllFeedbacks()
		} catch (e) {
			if (this.destroyed) return
			this.failures++
			if (this.failures >= 2) {
				this.state = null
				this.setStatus(InstanceStatus.ConnectionFailure, 'Rio not reachable — is Rio open, with HTTP enabled?')
				UpdateVariableValues(this)
				this.checkAllFeedbacks()
			}
		} finally {
			this.polling = false
		}
	}

	updateDefinitions() {
		UpdateActions(this)
		UpdateFeedbacks(this)
		UpdateVariableDefinitions(this)
		UpdatePresets(this)
	}
}

module.exports = RioInstance
module.exports.UpgradeScripts = UpgradeScripts
