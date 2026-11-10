# Step-by-step implementation prompt: “Wrong Dub”

Use this prompt to plan and implement a playable “Wrong Dub” mode for Shumy. Work in the existing project and preserve its architecture, game modes, visual identity, and user changes. Do not deploy, change server configuration, or publish anything.

## Product brief

Players record short voice lines for a silent scene, one role at a time. Shumy combines the takes with the scene, then the group watches the absurd new dub together. The joke comes from improvisation and mismatched dialogue, not from voice-acting skill.

Build the first version around original silent scenes made for Shumy or assets with an explicitly suitable license. Do not bundle recognizable movie clips, movie dialogue, characters, or music without permission for the intended use. Do not add user-supplied video uploads in this version. Treat movie-scene support as a future product and licensing decision, not as an assumed implementation detail.

Target a 2–4 minute round, including the final viewing. This is a playtest goal, not a measured result. Support 2–8 players in the normal flow. Scenes should run for about 10–20 seconds with 2–6 voice slots; aim for four player-voiced slots in the first deck. Avoid long queues: players without a voice slot should have a clear audience role and be able to vote after the scene.

## Project rules

1. Read the repository `README.md`, `AGENTS.md`, `docs/PRODUCT.md`, and `docs/ARCHITECTURE.md` before implementation. Read the relevant game and design notes as well.
2. Inspect the existing code and identify the actual game client, host screen, room state, API actions, event transport, and media-serving path. Do not assume that proposed endpoints or services already exist.
3. Keep game logic on the server where it protects room membership, current phase, deadlines, slot ownership, and accepted submissions. Clients render current state and submit actions.
4. Reuse the current host/phone room flow and shared design language. Keep controls direct, states readable, and the layout responsive. Do not add a framework, library, permanent database, account system, or external API without a demonstrated need.
5. Keep comments rare. Any new code comments must be lowercase, have no trailing punctuation, and explain a non-obvious reason.
6. Make changes in the current checkout and preserve unrelated user changes. Do not commit, deploy, or change server, DNS, or proxy configuration.
7. Before editing, provide a brief implementation plan that names the existing files and state flow you intend to change. Then implement in small, reviewable steps and keep this prompt as the source of scope.

## Step 1: inspect and report the current architecture

Trace one existing game from host start to phone action to host result. Record:

- How rooms and player identities are represented.
- How the host is authorized and how room ownership is recovered.
- How phases, deadlines, and state changes are validated.
- How clients receive live updates and recover after reconnecting.
- Where static assets are served and whether temporary binary uploads are supported.
- Existing player, host, theme, language, accessibility, and mobile patterns.

Identify blockers to audio recording and synchronized playback. Separate confirmed existing capabilities from assumptions. Do not begin by rewriting the room system.

## Step 2: define the smallest playable vertical slice

Implement one original silent scene with four timed dialogue slots. Each participant gets at most one slot in the first pass. The loop is:

1. Host starts the round and sees the scene and slot count.
2. Server assigns voice slots and opens recording in order.
3. Assigned player reads a short cue, records a take, previews it, and submits or skips.
4. Server confirms the take and advances the slot.
5. Host reviews the assembled scene and explicitly starts playback.
6. Players watch the shared result, optionally vote for a favorite line, then continue or return to the lobby.

Prefer implementing and validating this complete loop over building multiple scenes or elaborate scoring. Keep the scene data-driven so more original scenes can be added without duplicating phase logic.

## Step 3: specify scene and slot data

Define a validated scene format containing:

- Stable scene ID and localized title.
- Licensed asset reference and its duration.
- Timed visual segments or a poster/storyboard fallback.
- Dialogue slots with start/end offsets, a brief cue, optional scripted line, and a safe fallback caption.
- A defined order for slots and any required playback gap.

Define a slot state with its owner, status, accepted take reference, deadline, and action/version identifiers. Do not put private takes, host secrets, or storage paths into public room snapshots. Do not let clients choose another player’s slot or change server-owned timestamps.

Validate scene manifests at load time. Reject missing assets, invalid offsets, overlapping or out-of-range slots, empty scenes, unsupported media types, and scenes whose fallback data is incomplete. Prefer a helpful development error over silently rendering a broken scene.

## Step 4: implement server-authoritative phases

Use the project’s existing phase and event conventions. The logical flow is:

`lobby → intro → assignment → recording → playback → voting → result → next round or lobby`

The server owns the current phase, deadlines, assignments, accepted take, voting window, and round result. Every action must validate room membership, player/host authority, phase, slot ownership, payload limits, and deadline. Include a monotonically changing phase/version and an idempotency key for submissions so retrying after a network delay cannot create duplicate takes or votes.

Suggested actions, adapted to existing naming conventions:

- Host: start, cancel, extend the recording window once, finish with skips, start playback, replay, skip voting, next round.
- Player: begin recording, submit take, replace take before slot lock, switch to text, skip, cast or change one vote while voting remains open.

Do not let a client extend its own deadline. A host may add at most 10 seconds once per round; this is a starting playtest setting, not a permanent balance decision. Close unfinished slots as skips when the shared deadline ends.

## Step 5: implement recording and media handling

Request microphone permission only after the player presses “Record”. Explain in plain language beforehand that the microphone is needed for one line and that the room will hear the submitted take. Do not open the microphone on room join or record in the background.

On the phone provide these actions and states:

- Read the assigned cue and see the slot’s time limit.
- “Record”, a clear recording indicator, remaining time, and “Stop”.
- Local preview with “Record again” and “Submit”.
- A confirmed “Take submitted” state, followed by who is still recording and an estimate/status for waiting.
- “Continue with text”, caption, or “Skip” when voice recording is unavailable or unwanted.

A take may be up to 8 seconds. The player can replace an unsubmitted local take. Once submitted, replacement is allowed only before the slot locks and must replace the prior accepted take atomically. The server must enforce duration, byte size, media type, and per-player, per-room, and per-round limits. Re-check the actual format rather than trusting a filename or client MIME declaration. Reject malformed or excessive media with a recoverable message.

Inspect the supported browsers and existing server before choosing an audio codec or storage mechanism. Do not add an untested codec by assumption. If playback support is unavailable, offer the text/caption path or a replayable scene storyboard instead of blocking the round.

Use only room-scoped, unguessable temporary media references that require room/player authorization. Do not expose filesystem paths or public permanent media URLs. Delete takes when the room ends or expires. For an in-memory prototype, impose a strict aggregate room limit and handle process loss honestly. If the current architecture cannot safely distribute binary data between server instances, document that limitation and keep the feature scoped to the verified deployment shape; do not invent a persistent storage service.

Before recording, tell players that their submitted voice line is visible to participants in the room and is deleted when the room ends. Update that message if the real retention behavior differs.

## Step 6: synchronize scene playback

The host TV is the authoritative shared player. Do not promise frame-perfect synchronization across unrelated devices. Use the server’s playback start time and scene-relative slot offsets to coordinate playback, with bounded correction appropriate to the existing event transport.

The host must press “Watch the dub” to start playback because browsers may block autoplay with sound. Each line plays at its scene offset, followed by the scene’s planned pause. Show readable captions alongside the recording. Replay always restarts the full scene from the beginning and never creates another recording.

Handle these playback fallbacks:

- Video or scene asset fails: show a static storyboard/caption sequence and play accepted takes by slot.
- Audio format cannot be decoded: let the host retry once, replace the affected line with its fallback caption, or skip the scene.
- Browser blocks autoplay: show a clear host play button.
- TV is muted: keep captions visible and offer replay; do not claim the voice was heard.
- Late or stale play event: ignore it if its phase/version is obsolete.
- Host refresh: restore the current room phase and server playback position where possible; do not reset deadlines.

If the existing runtime cannot host a single shared playback clock, prioritize correct ordered playback on the TV and synchronized phase status on phones. Document the limitation instead of letting clients independently drift through the clip.

## Step 7: implement host and TV UX

Keep the existing Shumy host lobby structure. Its game card should truthfully say: “Dub a silent scene, one line at a time.” Before start, show connected players, how many voice slots there are, scene length, and that assigned players record on their phones.

**Intro:** show the original scene title, a muted preview or still, role count, and a brief start countdown. Never show private upcoming cues on the TV.

**Recording:** show the scene muted, a timeline with the current dialogue marker, and concise slot statuses: “Recording”, “Ready”, “Skipped”, or “Caption”. Do not play takes as they arrive. Host controls: “Finish with skips”, one “Add 10 seconds”, and “Cancel round”. Make the consequences of each action clear.

**Playback:** give the scene the screen’s visual priority. Show the active caption and a restrained progress indicator. Provide “Replay from start” and “Continue”. Host actions control the shared playback.

**Result:** replay the full scene or show the completed scene with an optional favorite-line vote. Keep the result social and brief; do not create a quality ranking or a long score table. Continue to the next scene or return to the lobby.

On the TV, size type for viewing from across a room. Do not make participants read a wall of prompts. Identify each slot with its assigned player only when that does not reveal a private cue.

## Step 8: implement phone UX and accessibility

Phone phases:

1. **Waiting:** show the scene title, the player’s role/slot, and “Waiting to start”. Hide all other cues.
2. **Cue:** show only the player’s assigned cue, an optional short scripted line, the recording limit, and actions “Record”, “Use text”, and “Skip”. Never show future dialogue.
3. **Permission:** request the browser microphone permission after the user presses “Record”. If denied, do not repeatedly prompt; immediately offer text/caption or skip and a short instruction for changing browser permission later.
4. **Recording:** show a large record/stop control, clear active state, elapsed/remaining time, and a non-color status. Do not require holding a key or button.
5. **Preview:** play locally; offer “Record again” and “Submit”.
6. **Submitted:** show explicit server confirmation and a safe waiting state.
7. **Playback/result:** show the shared scene and current caption. Playback controls remain with the host.

Requirements:

- All actions have descriptive verb labels and work with keyboard and assistive technology.
- State differences use text/icons as well as color. Focus remains visible when phases change.
- Captions use readable text size and a high-contrast background. Do not show the full script at once.
- Respect `prefers-reduced-motion`; motion never communicates status by itself.
- Support 320 CSS px without horizontal scrolling, plus portrait and landscape phone layouts.
- Text alternatives and skipping are first-class routes, not public penalties.

## Step 9: handle edge cases

Implement and verify the following behaviors before broadening the scene deck.

**Room and assignment:**

- Fewer players than slots: keep one slot per person and replace remaining slots with authored captions. Do not silently give one player several lines in the first pass.
- More players than slots: label unassigned players as audience before the round begins; let them vote after viewing. Do not create an unbounded queue.
- Player joins mid-round: they watch and may vote if voting is open; they do not receive an active line.
- Player leaves before their slot: reassign it to an eligible player or use its caption. A returning player reclaims it only if it is still unassigned.
- Player leaves after submission: preserve the accepted take for this round; do not allocate the same slot twice.
- Player skips: lock the slot as skipped and continue. If the skip was accidental, the host may reopen it once before the next slot begins.
- Duplicate identity/device: do not allow duplicate accepted voices or votes. Follow the project’s existing session replacement behavior and communicate which device remains active.
- Scene has no playable lines, invalid timings, or missing fallback: prevent the scene from starting and show a clear host error.

**Microphone and take:**

- Permission denied, missing/busy microphone, or insecure context: offer text/caption or skip. Do not trap the round behind browser permission UI.
- Permission revoked during recording: accept only a valid finalized take; otherwise explain that it was not saved and offer a retry while the slot is open.
- Silent/quiet recording: do not reject automatically. Let the player preview and decide whether to retry.
- Page closes before submit: restore the identity and open slot if the deadline remains; if the local take cannot be recovered, say so and offer retry/text/skip.
- Upload delayed or retried: show “Sending”, prevent ambiguous double-submit, and use the idempotency key. A confirmed submission stays confirmed after reconnect.
- Corrupt, oversized, too-long, or unsupported audio: reject without locking the slot and give a path to record again or use text.
- Late submission, old-phase action, or action for another player’s slot: reject without changing room state and return the current phase.

**Network, host, and playback:**

- Phone disconnects after accepted upload: keep the accepted take; restore status on return.
- Temporary host disconnect: players may finish current submissions until the shared deadline. Restore current phase on host return.
- Host refresh: restore room and phase without restarting timers.
- Process restart with only in-memory takes: mark the round interrupted and offer a restart; never show “ready” if the media is lost.
- Duplicate event or late state snapshot: ignore by action and phase/version identifiers.
- Autoplay blocked: require a host click.
- Scene asset fails: fall back to storyboard and captions.
- Media decode fails: permit one retry, fallback caption for that line, or skip the scene.
- Room ends/expires: release temporary media and clear per-round data.

**Comfort and content:**

- Player does not want to speak: let them use text/caption or skip without penalty or public callout.
- User does not want to hear their own take: offer local mute for that player without changing room playback.
- Improvised text is inappropriate: keep it private until host review; allow the host to hide it and use the authored caption. Validate text length and markup before rendering.
- Voice content: do not claim automated moderation in this version. Keep the room private to its participants and provide a host hide action.
- Scene does not suit the group: let the host change it before start. Make age/tone expectations clear in the scene selection.
- Avoid unexpected volume: show a pre-round sound check and do not amplify recordings automatically.

## Step 10: scoring and audience interaction

Do not reward loudness, accent, recording quality, or speed. Participation can grant the same small contribution to each submitted voice slot, but score is optional. After playback, offer one vote per participant for “favorite line”. Votes are anonymous until the vote closes and may be changed only while the window is open. Let players skip voting. The host can close voting, but a non-voter never blocks the next round. Ties produce shared recognition or a random tie-break that is clearly labeled; do not create a fake precision ranking.

## Step 11: seed the first scene deck

Create six original 10–20 second silent scenes for Shumy, each with validated slot timing, authored fallback captions, short cues, and a safe neutral tone:

- A dramatic argument with an everyday object.
- A very serious interrogation about a missing snack.
- An alien learning kitchen rules.
- A tense choice between two ordinary dishes.
- A delivery arriving in the wrong historical era.
- A silent plan to save a party.

These are production briefs, not permission to use existing film footage. Keep lines short enough to read before recording. Include subtitles and a static storyboard fallback for each scene. Do not block a playable prototype on having all six scenes; one complete, cleared original scene is enough for the vertical slice.

## Step 12: validate in a staged sequence

For each step, state what you changed and how you verified it. Add tests only when explicitly requested or when they cover a concrete regression existing checks miss. Do not deploy.

1. Validate scene data and state transitions, including illegal/stale actions and idempotent retries.
2. Verify happy path with at least two distinct players, one assigned slot each, final playback, and continuation.
3. Verify all skip and fallback paths: text, no permission, no microphone, quiet audio, unsupported/corrupt take, absent player, and missing asset.
4. Verify reconnect and refresh during intro, recording, and playback; confirm deadlines and accepted takes do not silently reset or duplicate.
5. Verify the 320 CSS px phone layout, portrait and landscape orientation, keyboard focus, captions, reduced motion, dark and light theme if the existing game supports both.
6. Verify host and player authorization, per-request size/duration limits, room cleanup, and that media cannot be fetched without room authorization.
7. Check the audio format and flow on the supported target browsers and a weak network. Report exact browsers/devices and the remaining limitations; do not claim scale based on one local device.

## Completion report

Finish with:

- The files and behaviors changed.
- The full round flow now available.
- Which edge cases were handled.
- What you verified and on which browsers/devices.
- Any unresolved codec, storage, synchronization, licensing, or capacity decisions.
- Confirmation that nothing was deployed.
