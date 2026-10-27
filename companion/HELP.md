## Holbox Design — Rio

Controls **Rio**, the live video software by Holbox Design: deck of clips, cue list, Preview, timeline, audio desk, stopwatches, texts and outputs.

Rio for Windows and macOS: [holboxdesign.com/rio](https://holboxdesign.com/rio) — API reference: [holboxdesign.com/rio#api](https://holboxdesign.com/rio#api).

Needs **Companion 5.0 or later**.

### Setup

1. In Rio: **Options › Connections › HTTP**. Note one of the IP addresses of the computer and the HTTP port (7001 by default).
2. In Companion: add a **Holbox Design: Rio** connection, enter that IP address and port.
3. The connection turns green when Rio answers. Rio 0.6 or later is needed for the button feedbacks and variables; the actions marked “Rio 0.7” or “Rio 0.7.2” need that version (an older Rio ignores them, a warning appears in the log).

Same computer as Companion: keep `127.0.0.1`. Another computer: allow Rio in its firewall (Windows, or the firewall of an antivirus).

### Actions

- **GO**, GO back, GO next, Panic, FTB, Blackout
- **Cues**: fire or stop a cue by its number (a cue of a group as numbered in Rio: 3.1, Rio 0.7.2); put the playhead on a cue without starting anything (Rio 0.7.2); pause / resume, restart what the cues play
- **Deck**: play a clip (layer × column), now or at the next loop start (Rio 0.7.2); play a column; show a deck; pause / restart what the deck plays
- **Preview**: CUT, FADE; (Rio 0.7) SWAP with what is on air (with or without the layer fade), clear, add / remove a clip
- **Layers**: clear, mute, solo, fade, opacity, live only, speed
- **Timeline**: play, pause, stop, VALIDATE the hold, select and play, switch from the deck to a timeline (live), go to a second, back to the deck
- **Director view**: inset message
- **Audio**: volume (up to 200 % = +6 dB on buses, inputs and PFL; above 100 %: Rio 0.7.2), volume in dB (Rio 0.7.2), mute and PFL of the Master, of each bus (bus 1 = Media) and of each input; send level of a strip to an aux, SEND ON AUX (Rio 0.7.2); audio effect on / off (Rio 0.7.2); tap tempo of a delay effect, or of every delay (Rio 0.7)
- **Stopwatches**: start, pause, start / pause, reset, restart from zero
- **Text sources**: next / previous text, show text k — **PDF**: next, previous, first, last, page n
- **Tempo**: BPM, tap, ÷2, ×2, beat 1 — global speed — image master
- **Video outputs**: all on / off; one output open / close (Rio 0.7.2)
- **Custom command**: any address of the Rio API (Rio › Options › Companion)

Dropdowns list the names of your show (cues, layers, columns, effects, outputs…) and accept a typed number too.

### Feedbacks

Cue running · cue is the next GO · layer playing · clip playing · layer muted / solo / live only · Preview not empty / something on a layer / this clip in the Preview · timeline playing / waiting for VALIDATE · audio strip muted / in PFL · audio effect on · stopwatch running / countdown finished · all outputs started · one output open · blackout · FTB · cues or deck paused · Rio connected.

### Variables

`connected`, `rio_version`, `session`, `cue_playhead_number`, `cue_playhead_name`, `cue_next_number`, `cue_next_name`, `cues_running`, `timeline_name`, `timeline_time`, `timeline_remaining`, `timeline_state`, `timeline_hold`, `bpm`, `speed`, `master`, `sound`, `deck`, `preview`, `preview_count`, `blackout`, `ftb`, `outputs`, `pfl_volume`, and per item: `layer_<n>_clip`, `layer_<n>_remaining`, `layer_<n>_opacity`, `clock_<n>`, `clock_<n>_name`, `text_<n>`, `text_<n>_item`, `bus_<n>_volume`, `input_<n>_volume`.

### Presets

Show control (with pause / restart of the cues and of the deck), Preview (CUT, FADE, SWAP, clear, what waits in it, one button per clip), timeline, one button per clip of the deck shown in Rio, layers (mute, clear, solo, fade, live only), audio desk (mute and PFL of every strip, TAP of the delays, every effect on / off), tempo, video outputs one by one, texts and PDF.
