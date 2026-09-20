# SPEC — Pac-Man clásico (web, HTML5 Canvas)

Faithful recreation of the 1980 arcade game's MECHANICS in 100% original code.
Do NOT copy any original Namco assets (no ripped sprites, no ripped audio). All
graphics are drawn procedurally on canvas; all audio is synthesized with Web
Audio API. UI language: **Spanish**.

## Nivel de jugador, cronómetro y amigos

**Nivel** (`PM.Level`, `CFG.LEVEL_*`): the level measures **how much you
play**, not how good you are — every point of every game is XP, no record and
no minimum needed. The level is **derived** from the total (never stored), so
it cannot drift. `cost(n) = LEVEL_BASE * n^LEVEL_EXP` — each step costs more
and there is no cap. XP is granted **once per run, however the run ends**
(`Game.closeRun()`, guarded by `xpSent`): game over, surrender, restart from
the pause menu or walking out to the menu mid-game. Awarding it only at GAME
OVER meant everything played was thrown away if you left first. Shown on the
title screen with a progress bar and, on level-up, as an in-game notice — or,
if the level went up as you left, as a prompt on the menu
(`Game.pendingLevelUp` → `UI.showLevelUpPrompt`).

**Cronómetro**: `Game.timeTicks` advances during `PLAYING` and `DYING` (not
while paused or stalled), rendered as mm:ss in the bottom HUD row. Online it
travels in the snapshot (`tm`), so the host owns it.

**Amigos** (`PM.Friends`, `CFG.FRIENDS_KEY`): a local list of names —
add/remove, sanitised like nicknames, no duplicates, cannot add yourself.
Each row can invite them to the party and spectate their game (see Party).

**Pausa**: `Game.canPause()` allows the menu in any in-game state except
GAME OVER (and while a net notice is up), so `Escape`/`P` also work during a
death animation or a level change — before, being killed locked you out.

## Party (salas de grupo persistentes) — `PM.Party`

The party and the game share ONE channel (`sala:<code>`), so joining once is
enough: returning to the menu or finishing a game does **not** disband the
group (`Game.toMenu()` calls `Party.resume()` instead of `Net.leave()`).

- Membership messages are `p`-prefixed so they never clash with game ones:
  `phello` (each member beats every 2 s), `proster` (the leader owns and
  broadcasts the list), `pbye`, `pfull`, `pstart` (leader starts; carries the
  ordered roster and the host settings). Members not heard from in 7 s drop
  off the list. Beating pauses while a game is running — but NOT while merely
  spectating someone else's, which uses a different channel.
- `pstart` gives everyone their own index: `order[i].s === Net.sid` →
  `localIdx`. `Net.lockPeers(others)` then filters the channel, and
  `Party.indexOf(sid)` is what `Game.idxOfSender` uses with 3 and 4 players.
- Duplicate colours are re-assigned to `CFG.PLAYER_COLORS[i]` so no two
  Pac-Men look the same.
- **Invitations**: every player also listens on a personal channel
  (`usuario:<nick>`, opened by `Party.listen()` from `showMenu`). An invite is
  a one-shot channel to the friend's topic carrying the party code; the same
  topic answers `donde` with `aqui {code, jugando}` for spectating.
- With **more than two players**, a `bye` or a silent player no longer kills
  the game: `Game.dropPlayer(i)` benches them (`out`) and the rest keep
  playing. The host runs a per-player watchdog (`posWatch[]`) because the
  global one only needs *somebody* to talk.

**Espectador** (`net: 'spec'`, `localIdx = -1`): the host answers a
`hello {spec:1}` with `svista` (player count, names, colours, skins, settings)
plus a full snapshot with pellets. The spectator runs the guest loop with no
Pac-Man of its own: it sends nothing, cannot eat, chat, emote or surrender,
its pause is local, and the game never counts as its own (no history, no XP,
no ranking).

**Escaparate** (local games): a game with no `netRole` has no room, so a
friend could not watch it at all. `Game.openShowcase()` (called from
`newGame`, needs `Net.configured()` and a non-empty `rawName(0)`) opens
`sala:<randomCode>` as an **outbound-only** channel: it answers
`hello {spec:1}` with `sendShowView` (same `specView` payload as online) and
`stepShowcase()` pushes `snap` on the normal `SNAP_EVERY` cadence, while
`hostEvt` mirrors events into it. Nothing else is read from that channel and
the game never waits on it — on error it just closes (`closeShowcase`, also
called from `toMenu`). `Party.onUser('donde')` answers with the party code if
there is one, otherwise with `Game.showCode`, so the watcher's path is
identical for online and local games.

Watching runs on a **separate channel** (`Net.openView` → `viewCh`,
`viewHandler`, `viewOnClose`), never the main one, so the watcher's own party
stays connected the whole time and there is no need to leave the group. The
handlers must be passed **inside** `openView`'s `cbs` (`onMsg` / `onGone`):
`openView` starts by calling `closeView()`, which nulls `viewHandler`, so
assigning them just before the call silently wiped them and nothing ever
arrived.
`Game.netSend` funnels through `Net.gameSend`, which picks the view channel
when there is one; leaving a watched game only calls `Net.closeView()` and
then `Party.resume()`. If the watcher's own party starts a game, `Party.begin`
closes the view first and the watcher joins as a player.

## Logros, skins por nivel, perfil y cuentas

**Logros** (`PM.Achievements`, `CFG.ACHIEVEMENTS`, `CFG.ACH_KEY`): what is
stored are COUNTERS, never "unlocked yes/no" — `fantasmas`, `frutas`,
`partidas` (sum), `racha`, `nivelMax`, `limpios`, `puntosMax` (max) and
`mejorT1` (min, 0 = none yet). Each achievement declares `stat`, `goal` and
optionally `menor` (lower is better). This is what makes them recomputable at
any time — signing into an account merges counters and the achievement list
falls out of them, with no history of when anything happened. `claim()`
returns newly earned ones not yet announced; `Game.bumpAch()` records and
queues the in-game notice. Spectating records nothing, and online only your
own kills/fruits count.

**Per-mode achievements.** An achievement may declare `modo`, and then it
reads a mode-scoped counter keyed `modo + ':' + stat` (`hab:mordiscos`,
`party:partidas`, …). Every run carries **tags** (`Game.achTags()`) and
`Achievements.recordFor(tags, o)` writes each counter twice: once global,
once per tag. The tags are a list because a run is two things at once — a
**format** (`solo` / `party`) and a **mode** (`clasico`, `lab`, `vs`,
`hab`); a party of DESATADO counts for both. The mode half *is* exclusive:
`clasico` deliberately excludes alternative mazes and DESATADO, since each has
its own achievements and its own wording. `daily` is also a tag, but it is not
a mode — `PM.Daily` writes it directly so its three achievements get their own
group and colour (see **DAILY**).

**History earned before per-mode tracking existed is not thrown away.**
Scoped counters started at zero, so a player with a hundred runs read
"JUEGA 50 PARTIDAS EN CLÁSICO · 0/50" — discarding work that is theirs.
That history only exists in the global counters, which do not record which
mode it came from, so `Achievements.sembrarModos()` seeds the scoped ones
from the only evidence available: **`clasico` takes the globals** (it is the
default mode and the bulk of any history, and a mode counter can never
legitimately exceed the global, so this can overshoot but never fall short —
erring in the player's favour is the right side when the data is gone), and
**`party` only if a duo/trio/squad record proves they played with others**.
`lab`, `vs` and `hab` stay at zero: there is no trace of them, and nothing is
invented (the DAILY counters have their own seeding, `sembrarDaily`). It runs **once** (flag `m` in the save) — repeating it
would let party runs keep inflating the classic counter forever — with one
deliberate exception: `merge()` clears the flag so signing into an account
re-seeds from the cloud history, which may be far longer than this browser's.
The LOGROS header says so out loud.

Nothing about the scoped keys is written by hand: `Achievements.STATS` is
built at load from `BASE` plus whatever `CFG.ACHIEVEMENTS` asks for, so
adding an achievement creates its counter, and **only counters some
achievement actually reads are stored** — the save file does not grow for
nothing. Existing saves keep working untouched: their keys are the global
ones and the scoped ones simply start at zero. The same applies to the
cloud (`perfiles.logros` is jsonb and `merge()` iterates `STATS`).

Three counters exist only for these: `mordiscos` and `muros` (bumped in
`habilidades.js`, on the machine of whoever pressed the key — the host also
*executes* powers requested by guests, and those are not its own) and
`cazas`, which is bumped once in `closeRun()` from `Game.myCatches()`
rather than at catch time, because the hunter's score rides in the
snapshots and that is the only way it adds up the same for host and guest.

All of them live in **one list** in PERFIL → LOGROS; what tells them apart
is the mode name printed in its own colour ahead of the description
(`CFG.achModoName`, `.ach-modo`). Global ones read `CUALQUIER MODO`.

> Fixed alongside: an online **guest never counted the ghosts it ate**
> (`eatGhost` only bumps on the host, and the guest's prediction bumped
> nothing), so `runGhosts` read 0 in its end-of-run panel and party ghost
> achievements were host-only. `applyEvt('eatGhost')` now credits the guest
> off the **confirmed** event, never the prediction.

**The `pixel` skin is a real pixel sprite**, not the vector body sampled on a
grid. Three rules make it read as a Pac-Man (all three were broken in the
first version, which came out shapeless):
1. **The grid is centred** — `PIX_N` (7) odd cells of `PIX_PASO` (2) px around
   the middle, so there is a centre row and column and the back reads round.
   Walking `-r` to `+r` in steps of 1.5 is not symmetric at `r` = 6.5: the two
   sides came out different and the silhouette had no axis.
2. **Blocks are whole pixels on the game's grid** — the sprite is snapped once
   (`Math.round` outside the loop) and every block is an integer offset from
   that origin. Rounding block by block put the top edge at −6.5 and the
   bottom at +6.5, and `Math.round` sends both the same way: one pixel
   flatter on top than underneath. Snapping first also means the shape never
   changes — it just moves a pixel at a time, like any pixel art.
   Each block is then shrunk by `PIX_RAYA` (**1 screen pixel**) on its bottom
   and right edges, which is the **gap that makes the blocks read as separate
   pixels** — the whole point of the skin. That gap existed in the first
   version too, but only as a side effect: blocks landed on half-pixels and
   the browser blurred them, so it came out dirty and a different width per
   block. Drawn deliberately on snapped blocks it is crisp and constant.
   Measured in *screen* pixels, not tile units: it is a hairline, and in tile
   units it would grow with the scale until it ate the block.
3. **The mouth eats whole cells** — the wedge is tested against each cell's
   centre, so the lips come out straight instead of ragged.

Edge cells are clipped to the circle and rounded **inward**, which leaves the
four poles one pixel tall and the body 12 px across: seven 2 px cells would be
14, exactly what the corridor gives (`TILE + 2*WALL_INSET`), and it would
scrape the walls again. `js/tests.js` pins the size, the mirror symmetry and
the absence of seams between blocks.

**Skins by level** (unlock order `clasico` 1, `sombra` 3, `ojos` 7, `neon` 12,
`pixel` 20, `aro` 30 — `CFG.SKINS[].level`): gated on
`PM.Level.level()`. `Level.skinsAllowed(puesta)` always includes the skin
currently worn — a raised requirement must never strip what a player already
has. Locked ones render greyed with the level they need.

**Your whole look lives in PERFIL** — avatar, **colour** and skin. It is who
you are in the room, not a setting of this machine, which is what OPCIONES is
for; that panel keeps only the second local player's colour and skin, which
*is* a setting of this machine. Both colour rows register into the same
`UI.colorRows` and both skin rows into `UI.skinRows`, so `refreshColorRows()`
and `refreshSkins()` repaint them wherever they are; `setColor` refreshes the
whole of PERFIL when it is yours, because your colour tints the header avatar
and every skin thumbnail. `optionsMsg()` writes the "locked skin" notice into
both panels' status lines because the click can come from either.

**Perfil** (`#profile`, tabs PERFIL / LOGROS): avatar, name, level bar,
summary, avatar picker, your colour, your skin and the account box. Colour
goes **before** skin: it tints it. Avatars (`CFG.AVATARS`) are drawn
by `Sprites.drawAvatar` reusing the game's own sprites (faces, ghosts, fruit,
badge) scaled from a ~7 px native radius. Guests get a random-name button
(`CFG.RANDOM_NAMES`).

**Cuentas** (`PM.Account`, `CFG.ACCOUNT`): Supabase Auth over REST, no SDK.
The player only ever sees usuario + contraseña; the e-mail Supabase requires
is composed internally as `<usuario>@<MAIL_DOMAIN>` and never shown. The
usuario IS the in-game name, so ranking, party, invites and spectating keep
working off a single name. Tables `perfiles` and `amigos` live in
`supabase/cuentas.sql` with RLS (public read, owner-only writes). Signing in
runs `applyRemote` + `push`: cloud and local are MERGED keeping the best of
each (xp/records/counters never go down), so entering an account can never
cost progress. The profile carries **one record per format** —
`record1..record4`, driven by `Account.recordCols` against
`Game.recordFor/setRecordFor` — so the four mastery tracks follow the account
without storing a single badge list: each track is derived from its format's
record. Friends require an account; `PM.Friends` is only a local cache of the
cloud list.

`record3`/`record4` arrived after the table did, so **a project that has not
re-run `supabase/cuentas.sql` still works**: PostgREST answers 400 naming the
missing column, `Account.sinRecordsNuevos` is raised and the request is
retried without those two fields (`push`) or without those two columns in the
`select` (`pedirPerfiles`, shared by `fetchProfile`/`fetchProfiles`). Losing
the server migration costs the two new records, never the old ones. The flag
is memory-only, so the next session tries the full shape again.

The Supabase project MUST have Email provider on, sign-ups allowed and
**Confirm email off** — the internal mailbox does not exist, so a confirmation
link would lock every account out.

### Your look travels with the account (`ajustes` column, 19 Sep 2026)

Buying a skin already travelled — purchases are counters inside `logros` — but
**wearing it did not**. Opening your account on another computer gave you back
your records and your wardrobe, then put you in the factory-yellow Pac-Man
with factory sound. The half nobody sees was in the cloud; the half everybody
sees stayed in one browser's `localStorage`.

`perfiles.ajustes` (jsonb, ≤4 KB) now carries the keys listed in
`CFG.AJUSTES_NUBE` — look (`skin1`, `pacColor`, `acc1`, `efx1`, `emotes1`,
`avatar`), how you play (`modePick`, `habRol1`, the five difficulty values)
and how it sounds (`muted` + the five buses) — plus a `ts` stamp.

**Who wins is the LAST CHANGE, not the best of each side.** The merge rule the
rest of the account uses (keep the higher number) is meaningless for a colour:
there is no better magenta. So `UI.saveSettings()` compares a snapshot of
those keys on every save and, when one really changed, stamps `ajustesTs` and
schedules a debounced `pushQuiet` (3 s — dragging a volume slider is fifty
saves in a row, and each one used to be nothing, not a write). On sign-in,
`applyRemote` hands the cloud blob to `UI.aplicarAjustesDeNube`, which applies
it **only if its `ts` is strictly newer**; on a tie or an older stamp it keeps
what is here and the `push` that follows uploads it. So changing your skin on
this machine and then signing in does not undo it.

Nothing is taken raw: every value goes through the same `sanitizeSetting` as
locally stored settings, so a hand-edited row cannot inject a skin that does
not exist or a volume of 1000. Ownership is still checked at use time by
`PM.Tienda` (`accesorio`/`efecto`/`emotes`), so carrying a look never grants a
piece. And because `applyRemote` merges `logros` *before* applying the look, a
skin unlocked on the other machine is already unlocked here when it is worn.

Signing out clears the look back to factory along with the rest
(`limpiarLocal`): otherwise the next person to sign in from that computer
would appear wearing the previous one's skin and accessory, and with a stamp
that would beat their own account.

Same migration discipline as `record3`/`record4`: a project that has not
re-run `supabase/cuentas.sql` answers 400 naming `ajustes`,
`Account.sinAjustes` is raised and the profile is pushed without it. Losing
the migration costs the travelling look, never the records.

### The real e-mail, and password recovery (`functions/cuenta`)

That internal mailbox is why forgetting your password used to **destroy the
account**: Supabase's own recovery mail went to an address that does not exist.
Four records, the XP, the achievements and twelve mastery tracks, gone, with no
way back. It was the only item on the roadmap that *subtracted* every time it
happened.

**The account's e-mail is now the player's real one**, asked for at sign-up,
and recovery is the ordinary flow: request the link, open it, set a new
password. It is used for exactly that — never to log in, never shown anywhere
in the game.

**And you still log in with your usuario.** Supabase Auth identifies accounts
by e-mail, so something has to resolve usuario → e-mail; that something is the
Edge Function `cuenta`, with the service role. **No e-mail address ever reaches
a browser** (not even your own, except masked), which is precisely what could
not be promised if the client had to look one up to sign in — usernames are
public (they are in the ranking), so that endpoint would be a mailing list.

`cuenta` is deployed with **`verify_jwt: false`** on purpose: everyone who
calls it is by definition without a session. Three ops:

- **`alta`** {usuario, pass, correo}. Checks the usuario is free, creates the
  auth user with `email_confirm: true` (the e-mail is for recovery, not for
  vetting anybody — a confirmation step before you can play buys nothing
  here), inserts the profile, returns a session. **If the profile insert
  fails, the auth user is deleted**: otherwise a taken usuario leaves an orphan
  account *and* burns that person's e-mail address, so they cannot even retry
  under another name.
- **`entrar`** {usuario, pass}. Resolves the e-mail and forwards the password
  grant. A usuario that does not exist and a wrong password answer identically.

**Passwords are always UPPERCASED** (18 Sep, `passUp` in `js/account.js`), on
sign-up, sign-in and change. The whole game is written in caps and people typed
their password however the keyboard felt that day, which locked out accounts
over nothing. Existing hashes cannot be converted — Supabase stores bcrypt, not
the password — so `signIn` retries **exactly as typed** when the uppercase
attempt fails with a credentials error (never on a network error, never when
both are identical) and, once in, rewrites the password to its uppercase form
with the fresh session. The second login goes through the normal door.
- **`olvide`** {usuario}. Resolves the e-mail and calls `/auth/v1/recover`.
  Returns the address **masked** (`m****o@g****.com`) so the player knows which
  inbox to open without it being readable off anyone's screen.

Old accounts keep working untouched — `entrar` resolves their internal address
without noticing — but `olvide` detects the `MAIL_DOMAIN` suffix and says so
plainly (`ESA CUENTA NO TIENE CORREO PUESTO`) instead of leaving somebody
waiting for a message that cannot exist. They set a real one from PERFIL, which
is a plain `PUT /auth/v1/user` with their own session.

The link returns to the game as `SITE_URL#access_token=…&type=recovery`;
`Account.desdeRecuperacion()` picks it up **before `restore()`** (whoever opens
that link wants *that* account), clears the hash so a reload does not repeat
the trip, and hands over to the "new password" dialog.

Project settings this depends on, all applied via the Management API:
`site_url` and `uri_allow_list` pointing at the game (otherwise the link goes
to localhost), and `mailer_secure_email_change_enabled: false` — with it on,
changing an address needs a confirmation on the **old** one too, which for the
accounts that need this most is a mailbox that does not exist.

> **The default sender is not enough**, and this is the one piece still
> missing. With no `smtp_host` configured Supabase uses its test sender: 2
> e-mails an hour, project-wide, and not intended for addresses outside the
> org — `/auth/v1/recover` returns 200 and nothing leaves. The chosen fix is
> Gmail with an app password (`smtp.gmail.com:465`); `supabase/correos.js` then
> replaces Supabase's English templates with Spanish ones in the game's own
> style, and **it only works once a custom SMTP exists** — Supabase refuses
> template edits on the default provider. Everything else is in place
> regardless; see `PENDIENTE.md`.

`grant select, insert, update on public.perfiles to service_role` is part of
`cuentas.sql` and is not optional: **the service role bypasses RLS but not
table grants**, and without it the function gets a bare 42501 and answers
"usuario o contraseña mal" forever with no way to guess why.

## Las CIFRAS del perfil (`js/stats.js` — `PM.Stats`)

PERFIL has a third tab, CIFRAS, holding everything that is known about a
player. Nothing new is stored for it: it all comes from the achievement
COUNTERS (which already travel to the account in `perfiles.logros`) and from
the experience (`PM.Level`, which *is* the sum of every game's score).
`Stats.de(contadores, xp, records)` chews them into one object;
`Stats.mios()` does it for the local player and `Stats.deFila(fila)` for a
row pulled from the cloud.

That symmetry is the point: **someone else's profile is rendered by the same
code**, so their figures and their shape can sit next to yours. The friend
profile passes both and the polygon draws the two on top of each other — the
visitor in yellow, you in blue. A trophy case is not competitive; a yardstick
is.

### The polygon (`Stats.radar`, `Stats.dibujarRadar`)

Six axes, each 0..1 against a ceiling in `CFG.STATS.EJES`: ATAQUE (ghosts per
game), PUNTOS (best game), AGUANTE (levels cleared in a row without dying),
ALCANCE (deepest level), CONSTANCIA (DAILY challenges met) and VARIEDAD (how
many of the five worlds have been played). The ceilings were picked against a
700-game account so the shape has peaks and valleys instead of coming out
round or pinned at the centre. Every axis also carries its real number
(`texto`): a polygon with no figures is a drawing, and nobody can argue with
a drawing.

### The per-mode table cannot trust the per-mode counters

Per-mode counters came after the game, and seeding them meant filing every
already-played game under CLÁSICO (`sembrarModos`) — there was no way to know
which mode each one had been. Fine for achievements, which only test
thresholds; false for a statistics table, where it tells someone who only
plays DESATADO that they have never played it, and credits CLÁSICO with a
DESATADO score.

So the table takes its **best** from the records (per-format records are the
1980 maze and DESATADO does not enter them; `record_hab`/`record_lab` are
their own) and, for **games played**, prints a dash where the counter says
zero but there is a trace of having played that mode (`Stats.rastroDe`: its
record, its bites, its catches). A lying zero is worse than an honest
"unknown".

What no file knows, the player does. `Achievements.declararReparto(pct)`
records that `pct` % of the old games were DESATADO (`repHab`) along with how
many games there were when it was said (`repBase`), so the split applies to
**those only** — anything played afterwards is counted properly on its own.
Both are `mayor` counters so they ride to the account and back (merging keeps
the higher side, which is exactly what lets a declaration reach a device that
never made one). Split numbers are shown with a `~` and the footer says whose
word they are: declared, not measured.

**`hab:partidas` did not exist.** A per-mode counter was only stored if some
achievement looked at it, and no DESATADO achievement counts games, so that
mode would have read zero forever. `STATS` now also includes the four figures
the table shows (`partidas`, `puntosMax`, `fantasmas`, `tiempo`) for the five
worlds in `CFG.STATS.MUNDOS`.

### Counters added for it

`racha2`/`racha3`/`racha4` (doubles, triples, quadruples), `tiempo`
(seconds played), `niveles`, `pastillas` and `super`. They ride the usual
funnel (`bumpAch`), so they also split per world for free (`hab:tiempo`,
`lab:pastillas`). The chain counters are **cumulative** — a quadruple counts
in all three — because that is what merges cleanly across devices; the
screen subtracts to show the exact ones.

**Four is the ceiling today**, and the test pins it there rather than trusting
the claim: there are four ghosts and none turns blue again
within the same fright: `eaten()` clears `frightened` and only
`triggerFright` sets it, which also resets the chain — including the
DESATADO GRITO. The MORDISCO joins an existing chain but cannot invent a
fifth ghost. There is a test that eats all four and then asserts no blue
ghost is left with the fright still running.

Pellets are counted per run (`runPastillas`/`runSuper`) and flushed in
`closeRun`: calling `bumpAch` on every pellet would run the whole
achievement and DAILY machinery sixty times a second.

### Seeding, and saying what is estimated

`Achievements.sembrarCifras` (flag `e`, like the other seedings, cleared by
`merge` so the cloud's longer history re-seeds) fills the new counters with
what is already known, always as a **lower bound**: `niveles` = `nivelMax` − 1
(to reach level N you cleared N−1), `pastillas` = those levels × 244,
`super` = × 4, and the best chain proves that chain happened at least once.
`tiempo` is the exception and the only estimate: lifetime points over
`CFG.STATS.PTS_POR_SEG`, because it was never recorded. `tiempoEstimado()`
returns how much of it came from there and the screen prints it at the
bottom. Inventing a nicer figure would be worse than giving none — this
screen is where people compare themselves.

## App instalable (PWA) y pruebas

`manifest.json` + `sw.js` make the game installable and playable offline:
the shell (HTML, CSS, every `js/`, the streak audio and the icons) is
precached; **all code** (HTML, CSS, JS, JSON) is **network-first** so a new
deploy shows up at once and still works without a connection — with the copy
first you kept seeing the previous version for a whole visit. Media (audio,
icons) is cache-first, and cross-origin requests (Supabase: rooms and
ranking) always bypass the worker. Registered only over http(s) — with
`file://` there is no service worker and the game runs as before. Icons in
`icons/` are the game's own Pac-Man rendered to PNG.

Two ways to run the same battery: open `tests.html` from a server like the
game, or `node pruebas-node.js` (fake DOM, exits non-zero on failure, skips
only the pixel-counting checks — they guard themselves with
`window.__SIN_LIENZO`). After editing `js/`, serve `tests.html` on a NEW port
or the browser's heuristic cache will hand you the previous file and you will
be testing stale code.

`tests.html` runs `js/tests.js`: a dependency-free suite over the real
modules, covering what has broken before (per-player death, the `dy`
keep-alive that once froze the other player, streak voices, the solo/duo
badge split, ranking guards, history, chat sanitising, pause, party rosters,
big-group drop-outs, spectating). Open it from a server like the game;
results also land in `window.__TESTS`.

## Hard constraints

- Plain JS, **no ES modules** (must run from `file://`). Classic `<script>` tags
  loaded in order. Shared state lives under the `window.PM` namespace.
- No external network resources (fonts, CDNs, images). Fully offline for the
  local modes; ONLY the online mode talks to the network (Supabase Realtime),
  with a hand-written client (no external libraries).
- Files (all inside the project root):
  - `index.html`
  - `css/style.css`
  - `js/config.js`  — constants, maze, level tables (defines `PM.CFG`)
  - `js/audio.js`   — `window.AudioSys` (see Audio API)
  - `js/sprites.js` — procedural sprite drawing (defines `PM.Sprites`)
  - `js/pacman.js`  — player entity (defines `PM.Pacman`)
  - `js/ghost.js`   — ghost AI (defines `PM.Ghost`)
  - `js/net-config.js` — Supabase credentials placeholder (defines `PM.NET_CFG`)
  - `js/net.js`     — realtime transport for online mode (defines `PM.Net`)
  - `js/party.js`   — persistent group rooms and invites (defines `PM.Party`)
  - `js/achievements.js` — achievement counters (defines `PM.Achievements`)
  - `js/account.js` — Supabase Auth accounts + cloud profile (defines `PM.Account`)
  - `js/game.js`    — state machine + fixed-timestep loop (defines `PM.Game`)
  - `js/ui.js`      — menus, settings panel, party panel (defines `PM.UI`)
  - Script order in index.html: config, audio, sprites, pacman, ghost,
    net-config, net, party, badges, history, level, friends, ranking,
    achievements, account, game, ui.
- Rendering: native resolution 224×288 px (28×36 tiles of 8 px: 3 top rows for
  scores, 31 maze rows, 2 bottom rows for lives/fruits). Integer-scale up (×2.5
  or ×3) with `imageSmoothingEnabled=false` for crisp pixels. Game logic runs in
  native px (8 px per tile), fixed timestep 60 Hz with accumulator +
  requestAnimationFrame.

## Maze (28 cols × 31 rows, row 0 = top)

Symbols: `#` wall, `.` dot (10 pts), `o` energizer (50 pts), space = empty path
or out-of-bounds, `-` ghost house door. EXACT layout (each line 28 chars):

```
############################
#............##............#
#.####.#####.##.#####.####.#
#o####.#####.##.#####.####o#
#.####.#####.##.#####.####.#
#..........................#
#.####.##.########.##.####.#
#.####.##.########.##.####.#
#......##....##....##......#
######.##### ## #####.######
######.##### ## #####.######
######.##          ##.######
######.## ###--### ##.######
######.## #      # ##.######
      .   #      #   .      
######.## #      # ##.######
######.## ######## ##.######
######.##          ##.######
######.## ######## ##.######
######.## ######## ##.######
#............##............#
#.####.#####.##.#####.####.#
#.####.#####.##.#####.####.#
#o..##.......  .......##..o#
###.##.##.########.##.##.###
###.##.##.########.##.##.###
#......##....##....##......#
#.##########.##.##########.#
#.##########.##.##########.#
#..........................#
############################
```

- Total pellets MUST be 244 (240 dots + 4 energizers). Assert at load,
  `console.error` on mismatch.
- Tunnel: row 14; exiting left of col 0 wraps to col 27 and vice versa.
  Tunnel "slow zone" for ghosts: cols 0–5 and 22–27 on row 14.
- Ghost house: interior rows 13–15, cols 11–16; door at row 12, cols 13–14.
  Door is passable only for ghosts entering/leaving the house.
- Positions (tile coords, x may be x.5 = between tiles): Pac-Man start
  (13.5, 23); Blinky start (13.5, 11) outside; Pinky (13.5, 14), Inky
  (11.5, 14), Clyde (15.5, 14) inside house. Fruit spawns at (13.5, 17).
- Wall rendering: blue (#2121ff) stroke per wall edge that faces a corridor,
  **inset `CFG.WALL_INSET` (3) px into the wall tile** so blocks read thin
  and corridors wide, as in the arcade. That inset is what sets the corridor's
  breathing room: two facing walls leave `TILE + 2*WALL_INSET` = **14 px** of
  black, and **Pac-Man is 13 px across** (`CFG.PAC_R` 6.5, same as ghosts).
  At inset 2 the gap was 12 against 13 and the sprites literally shared pixels
  with the wall — going down a corridor Pac-Man looked fused to it.
  `js/tests.js` pins that comparison so neither number can drift into the
  other. Pink door, aligned with the
  neighbouring inset strokes; black background. Dots 2×2 px, energizers
  r=4 px blinking (~0.2 s on/off), color #ffb8ae.
- **Corners are rounded, not square** — the arcade maze never turns at a
  right angle. `Game.wallSide()` classifies each end of a stroke from two
  neighbours and `Game.wallEnd()` trims it by `CFG.WALL_RADIUS` and emits the
  quarter arc that closes it:
  - **convex** (perpendicular neighbour is corridor) — the wall ends and
    turns inward; the arc sits inside this tile;
  - **concave** (perpendicular neighbour and diagonal are both wall) — the
    corridor is the one turning; the arc wraps the corner from outside;
  - **straight** (perpendicular is wall, diagonal is corridor) — the stroke
    continues into the next tile, no corner.

  Both strokes meeting at a corner emit the same arc with the same geometry,
  so they land exactly on top of each other — cheaper than coordinating who
  draws it. `CFG.WALL_RADIUS` (1.5 px) is what a corner *asks for*;
  `Game.radioEsquina()` clamps it **per corner** to half of each of the two
  runs meeting there (`Game.largoTrazo()`), so a big block curves fully while
  a one-tile wall curves as much as it can. A global cap would have starved
  every block to fit the few short ones. Measuring the **whole run** and
  halving it is what keeps the two sides symmetric: they compute their arc
  independently, and a disagreement would tear the outline open right at the
  corner. `js/tests.js` only has to check that the shortest run keeps a
  positive stroke at all.
- **The maze canvas is built at screen scale**, not at native resolution.
  `Game.buildMazeCanvas(color, scale, lineWidth)` defaults to `CFG.SCALE` and
  `CFG.WALL_LINE`, draws in native coordinates through a context transform,
  and is blitted 1:1 (`drawImage` with explicit native width/height), so
  nothing is ever resampled. This is what allows a stroke **thinner than one
  native pixel**: `CFG.WALL_LINE` is **2 screen px** where a native pixel is
  3, and `CFG.WALL_LINE = CFG.SCALE` reproduces the old drawing exactly. Half
  a stroke — `Game.wallHalf`, in native units — replaces the old 0.5 offset
  so the stroke lands whole inside the inset instead of straddling two screen
  pixels. The maze-picker thumbnail calls the same function at
  `112/NATIVE_W` scale with a 1 px stroke rather than shrinking the game's
  canvas, which at 1:6 washed the walls out to nothing.

## Movement & speeds

100% speed = 75.7575 px/s at 8px tiles (= 1.26262 px per 1/60 s tick).
Entities move along tile centers; turns only allowed when aligned within
half-speed of a tile center (snap to center on turn). Pre-turn buffering:
remember last direction key; apply when the turn becomes legal. Cornering:
allow the queued perpendicular turn up to 4 px before center (arcade-style
cornering advantage).

Percent-of-max tables (multiply by user difficulty multipliers, clamp ≤ 1.05·max):

| Level | Pac | Pac(dots) | PacFright | Ghost | GhostTunnel | GhostFright |
|-------|-----|-----------|-----------|-------|-------------|-------------|
| 1     | 80  | 71        | 90        | 75    | 40          | 50          |
| 2–4   | 90  | 79        | 95        | 85    | 45          | 55          |
| 5–20  | 100 | 87        | 100       | 95    | 50          | 60          |
| 21+   | 90  | 79        | —         | 95    | 50          | —           |

Eating a dot pauses Pac-Man 1 tick; an energizer pauses 3 ticks.

**Pac(dots) is documentation, not a second brake.** That column is the *same*
mechanic as the 1-tick dot pause, measured tile-to-tile: at level 1, 8 px at
80% take 7.92 ticks, +1 = 8.92, i.e. 8/8.92 = 71%. Levels 2–4 give 79% and
5–20 give 87%. Pac-Man therefore always runs at `pac` (or `pacFright`) and the
pause does the rest; applying both left him ~10% slower than the arcade
through dot corridors, which alone broke every memorised pattern.

## Ghost AI (the core of fidelity — implement exactly)

Ghosts think ONE TILE AHEAD: the moment a ghost enters a tile it decides which
way it will leave, and executes that turn at the tile center. The target is
therefore sampled half a step before the junction — that is what produces the
arcade's occasional "wrong" turns and what makes memorised patterns hold.
The decision is dropped (and retaken) whenever it stops being valid: forced
reversal, being eaten, leaving the house.

The decision itself: choose the legal direction (no reversing) minimizing
**straight-line (euclidean) distance from the candidate next tile to the target
tile**; ties break by priority UP > LEFT > DOWN > RIGHT. Reversal is forced
only when mode switches scatter↔chase or on entering frightened, and it takes
effect IMMEDIATELY, wherever the ghost happens to be — it does not wait for a
tile center (ghosts inside the house just flip their bob direction).

Targets (tile coords; off-map targets are fine):
- **Blinky**: Pac-Man's tile. Scatter (25, -3).
- **Pinky**: 4 tiles ahead of Pac-Man's facing; reproduce the arcade overflow
  bug: when Pac-Man faces UP the target is 4 up AND 4 left. Scatter (2, -3).
- **Inky**: take the tile 2 ahead of Pac-Man (same UP bug: 2 up and 2 left),
  then double the vector from Blinky to that tile: target = blinky + 2·(mid −
  blinky). Scatter (27, 32).
- **Clyde**: if euclidean distance to Pac-Man > 8 tiles → Pac-Man's tile,
  else his scatter corner (0, 32). Scatter (0, 32).

Frightened mode: at each decision point pick a pseudo-random legal direction
(try random first; if illegal, scan up,left,down,right). Blue body + white
face; flashes white/blue N times before ending.

That "random" MUST be reproducible, like the arcade's counter: the game owns a
seeded generator (`Game.rndDir` / `Game.rndUnit`, reseeded from the level in
`resetLevel` and from level+lives in `respawn`) and the fruit's 9–10 s lifetime
draws from it too. `Math.random` anywhere in the simulation means the same
level plays out differently every run and no pattern can ever be memorised.

**No-up zones**: in chase/scatter, ghosts may NOT choose UP at tiles
**(12,11), (15,11), (12,23), (15,23)** — `CFG.NO_UP_TILES`. Which is why
those two corridors are only ever ridden downwards. (Frightened/eyes ignore
this, exactly like the arcade.)

> **Mind the row conversion.** The arcade documents these over the whole
> **screen** (36 rows): (12,14), (15,14), (12,26), (15,26). `CFG.MAZE` is the
> **maze only** (`CFG.ROWS` = 31), starting `CFG.TOP_ROWS` = **3** rows lower,
> so subtract **three**, not one. This spec said 13 and 25 for a while and the
> code carried both sets: the wrong four are wall or ghost-house interior in
> the classic maze — inert, which is why nobody noticed — but in the alternate
> mazes (12,25)/(15,25) landed on a straight vertical corridor, where a ghost
> coming up has no legal move at all (up forbidden, sides walled, reversing
> banned) and `Ghost.decide` returned `backDir`: a U-turn mid-corridor, the
> one thing ghosts never do outside a mode switch. Fixed; `js/tests.js` now
> pins the four tiles to the arcade values and checks every maze keeps them a
> junction with a way out.

**Scatter/chase schedule** (seconds; after the last entry chase forever;
mode switches force direction reversal):
- L1: 7, 20, 7, 20, 5, 20, 5, ∞
- L2–4: 7, 20, 7, 20, 5, 1033, 1/60, ∞
- L5+: 5, 20, 5, 20, 5, 1037, 1/60, ∞
The schedule TIMER PAUSES while frightened is active.

**Frightened duration/flashes** by level (seconds/flashes; multiply duration by
user `frightMult`): L1 6/5, L2 5/5, L3 4/5, L4 3/5, L5 2/5, L6 5/5, L7 2/5,
L8 2/5, L9 1/3, L10 5/5, L11 2/5, L12 1/3, L13 1/3, L14 3/5, L15 1/3, L16 1/3,
L17 0, L18 1/3, L19+ 0. Duration 0 ⇒ ghosts only reverse, no blue mode.
Eaten-ghost chain: 200, 400, 800, 1600 (resets per energizer). On eating a
ghost: freeze gameplay 1 s showing the score where the ghost was (Pac hidden),
eyes then return to house, re-emerge in current mode.

**Ghost house exit** (dot counters, arcade rules):
- Pinky personal limit 0; Inky 30 on L1 else 0; Clyde 60 on L1, 50 on L2,
  else 0. Personal counters only count while that ghost is the "preferred"
  (Pinky→Inky→Clyde) one inside.
- After a life is lost, a GLOBAL counter is used instead: Pinky leaves at 7,
  Inky at 17, Clyde at 32 (when Clyde's 32 is reached, revert to personal
  counters).
- Failsafe timer: if Pac-Man eats no dot for 4 s (L1–4) / 3 s (L5+), the
  preferred ghost inside leaves.
- Inside the house ghosts bob up/down; leaving = move to center then up
  through the door to (13.5, 11).

**Cruise Elroy** (Blinky speed-up; disabled while Clyde is in the house after
a death, until Clyde leaves): thresholds by dots REMAINING —
L1 20/10, L2 30/15, L3–5 40/20, L6–8 50/25, L9–11 60/30, L12–14 80/40,
L15–18 100/50, L19+ 120/60. Elroy1 speed = ghost% + 5, Elroy2 = ghost% + 10.
Elroy ignores scatter (keeps chasing).

## Collisions, scoring, flow

- Collision = same tile as a ghost, checked once per tick and nothing else
  (chase/scatter ⇒ lose life; frightened ⇒ eat ghost; eyes ⇒ nothing).
  Crossing head-on through a ghost in a single tick is therefore possible,
  as in the arcade.
- Scoring: dot 10, energizer 50, ghosts 200/400/800/1600, fruit per table.
  Extra life at 10 000 (once). High score persisted (localStorage).
- Fruit: spawns at 70 and 170 dots eaten, lasts random 9–10 s, at (13.5,17).
  Table: L1 cherry 100, L2 strawberry 300, L3–4 peach 500, L5–6 apple 700,
  L7–8 grapes 1000, L9–10 galaxian 2000, L11–12 bell 3000, L13+ key 5000.
  Eaten fruit shows its score ~2 s. Bottom-right shows the last ≤7 level fruits.
- Level complete: all 244 pellets → freeze 1 s, ghosts hidden, maze walls
  flash white/blue 4×, ~2 s pause, next level.
- Death: ghosts freeze 1 s, then Pac death animation (~1.5 s, opening past
  180° and vanishing) + death sound; decrement lives; respawn READY (2 s) or
  GAME OVER text. **In 2-player modes the game only stops when the last one
  standing dies** — see "Muerte por jugador" below.
- States: MENU → READY ("¡LISTO!" text, intro melody first time: ~4.2 s) →
  PLAYING → (DYING | LEVEL_DONE | GAME_OVER) → …  P or Escape = pause, which
  opens the pause menu (REANUDAR / REINICIAR `R` / SALIR `Q`). Game over shows
  its own panel (play again / menu) instead of dropping to MENU by itself.
- HUD: top "1UP" + score, "HIGH SCORE" + value (score font: bold monospace,
  white). Bottom-left: remaining lives as mini Pac-Mans (in the chosen color).
- Controls: Arrows + WASD. Touch: swipe on canvas (multi-touch; in local
  2-player mode the left half of the canvas steers J1 and the right half J2;
  in 1-player/online any swipe steers the local player). Touch devices also
  get on-screen controls during a game: a pause button (top-right) and
  directional pads — one centered pad in 1-player/online, two corner pads
  (left = J1, right = J2) in local 2-player.
- Collisions: same tile as a ghost, AND tile-swap in the same tick (head-on
  crossing). The original arcade let entities pass through each other when
  swapping tiles between frames; that is deliberately fixed here.

## Difficulty & settings (contract used by ui.js + game.js)

```js
PM.settings = {
  difficultyPreset: 'normal',  // 'facil' | 'normal' | 'dificil' | 'custom'
  nick1: '',             // player 1 name (also the player's own name online)
  nick2: '',             // player 2 name (local 2-player)
  modePick: 'clasico',   // mode picked on the front page (CFG.MODE_IDS)
  skin1: 'clasico',      // player 1 skin (also the player's own skin online)
  skin2: 'clasico',      // player 2 skin
  pacColor: '#ffff00',
  pac2Color: '#00ff00',  // player 2 color (2-player modes)
  livesMode: 'individual', // always: the shared pool is no longer offered
  ghostSpeedMult: 1.0,   // 0.5–1.2, step .05
  pacSpeedMult: 1.0,     // 0.8–1.3, step .05
  frightMult: 1.0,       // 0–2, step .25  (× frightened duration)
  startLives: 3,         // 1–5
  startLevel: 1,         // 1–21
  muted: false,
  volMaster: 1, volMusic: 1, volSfx: 1, volLoops: 0.8, volVoices: 1  // 0–1, step .1
}
```

Presets — facil: ghost .85, pac 1.05, fright 1.5, lives 5, level 1;
normal: 1/1/1/3/1 (arcade exact); dificil: ghost 1.1, pac 1.0, fright .5,
lives 2, level 5. Persist to localStorage `pacman-topmundial-settings`; high
score `pacman-topmundial-highscore`. Changes to speed/lives/level apply on next
new game; color + mute apply live.

**`difficultyPreset` is derived, never trusted.** It used to be a stored label
that nothing checked against the numbers, and the moment the two drifted apart
— settings saved without the label, a label that is not one of the four, a
hand-edited localStorage — the panel said NORMAL while the run started with
five lives, and the player had no way to suspect it: what they could see said
NORMAL. `presetDe(s)` (ui.js) now compares the five difficulty values
(`PRESET_KEYS`) against each preset with a 0.001 tolerance and returns the
match, or `'custom'`. `loadSettings()` recomputes it on every load, which also
heals anybody already out of sync; `refreshPresetButtons()` recomputes it
before lighting a button; `applyPreset` writes the five values and then derives
the label rather than asserting it. Adding a sixth value to `CFG.PRESETS`
means adding it to `PRESET_KEYS` too, or two different difficulties would pass
for the same one. `UI.presetActual()` exposes it for the tests.

Lives drawn on the HUD are `lives - 1`: the one currently in play is not
shown. That is the arcade convention and is deliberate — NORMAL's three lives
read as two icons.

**`modePick` is a setting, not session state.** The front-page carousel used
to reset to CLÁSICO on every reload: with the old six-card grid you could see
all of them at once so it barely showed, but a carousel makes it a two-arrow
toll every time you open the game. It is validated against `CFG.MODE_IDS`,
which lives in `config.js` precisely because the settings sanitiser has to
validate it without depending on load order — `MODOS` (the cards, with names,
colours and icons) stays at the top of `ui.js`, and a test asserts the two
lists never drift apart. `UI.pickMode()` persists on **pick**, not on play:
choosing is already the decision.

`ajustes` maps onto `PM.settings`: `velFantasmas` → `ghostSpeedMult`,
`velPac` → `pacSpeedMult`, `powerS` → `frightMult` (the frightened-duration
multiplier), `vidas` → `startLives`. Optional fifth key `vidasModo:
'individual'` travels only when a 2-player game did not use the default
shared lives pool — it changes the simulation, so a replay would diverge
without it. `modo: 'reto'` is still accepted by the format although the mode
is gone: replays of old challenge runs are shared links that still work, and
`modo` only changes behaviour for `hab`.

`maze` carries the alternative maze (LABERINTOS). It was missing until
2026-09-16, and it is the single setting that changes the simulation most —
the whole layout — so those replays played back in the 1980 maze with
Pac-Man walking through walls and a score that matched nothing. It rides as
an `ajustes` flag (`m` + id) because that part of the format was built to be
extended: the tail of the settings field is read **by what each flag is**,
not by its position, so old ten-field replays are unaffected. `valida()`
rejects a replay whose maze this build does not know (same rule the network
format already had): better called broken than shown in the wrong layout.
Replays of LABERINTOS recorded *before* this cannot be fixed — nothing in
them says which maze it was.

`PM.Replay.serializar(rep)` returns a compact URL-safe string (`~`-separated
fields — ten of them, plus an optional eleventh carrying the look — base36
numbers, tick deltas, one packed letter `G..V` per
player+direction pair and `*n` run-length for identical repeats) and
`PM.Replay.leer(texto)` parses it back. `leer(serializar(x))` must deep-equal
`x` — there is a test for that. `leer` never throws and returns `null` for
anything malformed: the text can arrive from a URL that went through a chat
app.

### The replay clock

`Replay.t` is **not** `Game.tick`. It only advances while the game really
simulates (`PLAYING`, `DYING`, `LEVEL_DONE`) and never during `READY`,
because the length of the READY banner comes from the intro tune and can
differ between runs. Nothing moves during READY, so freezing the clock there
costs nothing and makes the ticks line up every time. It also stops while
paused.

Ordering matters: on each `Game.step()`, `Replay.paso()` first injects every
entry with `tick <= t` and only then advances `t`. That places an injected
turn in exactly the same slot a live key press occupied — a key pressed
after step *k* lands before the simulation of step *k+1*.

**The armed Q (2026-09-15).** A Q pressed with nobody in range stays armed
(`pedirQ`) and bites by itself inside `Hab.paso()` — i.e. *in the middle* of a
step. Recordings used to store that bite, which the replay applied at the start
of the *next* step: one tick late, exactly the tick the ghost needs to touch
Pac-Man (a 93 870-point DESATADO run replayed as a death after a minute). Now
`Hab.pulsar` records the **press that arms** the Q and never the retry bite,
the recording carries the flag `q` (`ajustes.qArmada`), and while viewing such
a replay the retry is allowed (`Replay.reintentoVale`).

Recordings **without** `q` are rebuilt the first time they are opened
(`Replay.recomponer`, prompt PREPARANDO LA REPETICIÓN): every recorded power
really went off, so the replay is simulated at full speed (`G.simulandoFuera`
stops the main loop, sound muted) trying each Q either at its tick or one tick
earlier right after `Hab.paso` (`Replay.trasHab`, when someone is already in
range); the first recorded power that fails to fire marks a wrong earlier
choice, which is flipped (nearest 25 singly, then pairs of the nearest 8)
until the run ends with the recorded score. The choices (`dq`: index →
`temprano`/`normal`) are stored in the saved record so it only happens once.
Validated on the real 93 870 replay: same score and 124 ghosts.

**RLE terminator.** A run count is now closed with `.` (`5A*8.5G`): without it
`5A*8` followed by `5G` parsed as `5A*85` plus a bare `G`, which broke the text.
The decoder accepts both forms.

### Hooks in game.js (four calls and nothing else)

| Where | Call | Why |
|---|---|---|
| `newGame()` | `Replay.alEmpezar(opts)` | starts a recording, or restarts the replay being watched |
| `setPacDir()` | `Replay.entrada(idx, d)` | records the turn; returns `false` to swallow the input while a replay is playing |
| `step()` | `Replay.paso()` | injects turns and advances the replay clock |
| `closeRun()` | `Replay.alAcabar()` | closes and stores the replay, however the game ended |

The half-played run (`js/guardado.js`) hangs off the same two ends:
`Guardado.paso()` runs last in `step()` and `Guardado.borrar()` in
`closeRun()`, right after `alAcabar()` — and only if the run being closed was
recordable, which `closeRun` asks *before* clearing the recording.

Plus `Game.replaying` (guards `bumpAch` and `persistHighScore`) and
`Game.timeScale` (the fixed-step loop multiplies its accumulator by it, so x2
means more 1/60 s steps per frame — the simulation is untouched).

Asking for the direction a Pac-Man already wants is a no-op
(`setDesiredDir` only records the wish), so it is **not** stored. That is
what keeps a held-down key — which fires `keydown` every few hundredths of a
second — from filling the replay with identical entries.

### Watching a replay

A replay never counts (both formats): `xpSent`, `rankingSent` and `timeSent` are forced true
at start, `bumpAch` and `persistHighScore` bail out, no history row, no
world-ranking submission, no showcase channel. The on-screen controls (dpads,
emotes, surrender) are hidden and the keyboard cannot steer.

`Replay.pausaPrompt()` and `Replay.finPrompt()` replace the pause and GAME
OVER dialogs (`ui.js` delegates to them when `Game.replaying`), and a fixed
top bar shows the REPETICIÓN banner plus pause / x2 / restart / exit.
`REINICIAR` goes through `Game.restartGame()`, which lands back in
`newGame()` → `alEmpezar()` and simply rewinds the replay.

### Watching one is watching a video (`Replay.preparar` / `irA`)

Play, pause and x2 were all a replay had: no seeking, no rewinding, no idea of
how long it was. Rewinding is the hard one — an input replay has no positions
to jump to, so going back means rebuilding the run from the start every time,
and dragging a bar would be a one-second stutter per pixel.

So **opening a replay plays it once, off-screen and at full speed, leaving a
photo of the game every `CFG.REPLAY_FOTO_CADA` ticks** (10 s). That single
pass also yields the one thing the bar needs and the format never stored: how
long the run is (`Replay.tTotal`). From then on, `irA(tick)` restores the
photo before it and simulates the rest — never more than 600 steps, which is
instant. A 40-minute run leaves 240 photos (~1 MB) and takes a second or two
to prepare, behind a PREPARANDO LA REPETICIÓN dialog with a running clock and
CANCELAR.

The first chunk is **deferred**, not run inline: mounting a replay has to
leave the game exactly where it left it before (its first tick, nothing
simulated ahead), or anything that just reproduces a replay — the tests, for
one — would find half a run already played. `Replay.luego(fn)` is that
scheduler; the tests replace it with a synchronous one.

Both kinds of replay go through the same machinery: input replays re-simulate
and network ones re-apply their snapshots, but both advance with `Game.step()`
and both photograph the same way. A photo stores `t`, the two cursors
(`cursor`, `cursorEv`) and `Game.foto()`, so restoring one puts the entries
that had already been injected back where they were.

**The bar** (`replayBar`, inline styles like the rest of the module) is now
two rows: who played it and the buttons (`|<`, `<<`, PAUSA/SEGUIR, `>>`,
speed, SALIR) on top, and a draggable timeline below with current and total
time. Dragging seeks for real — the photos make that cheap — but at most every
80 ms, and lands exactly where the finger stops. Keyboard, via
`Replay.teclaVideo(ev)` wired into `ui.js` before the game input (a replay
ignores steering anyway): `←`/`→` jump `CFG.REPLAY_SALTO` (10 s), `Home`/`End`
go to the ends, space pauses, `X` cycles the speed
(`CFG.REPLAY_VELOCIDADES`: 0.5, 1, 2, 4). The pause dialog and the end panel
carry the same controls.

### `Game.foto()` / `Game.ponerFoto(f)`

The photo is what makes rewinding possible, and it is taken **by exclusion**:
every own field of `Game` that is data goes in, and only the things that are
not run state stay out (`FOTO_FUERA`: the canvas and its two pre-rendered
mazes, the showcase channel, the options the run started with; plus the three
CFG tables — `speedRow`, `fruitInfo`, `schedule` — which are copied by
reference because nothing mutates them). Pac-Men and ghosts are photographed
as plain data and **poured back into the existing instances**, never swapped,
because other modules hold references to them. Pellets ride as
`pelletHex()`. Outside `Game`, only DESATADO has state of its own
(`PM.Hab.foto`/`ponerFoto`); PAC-MAN VS. and CACERÍA keep everything in the
run itself.

Exclusion, not a whitelist, is deliberate: a list of what *does* go in falls
behind the first time somebody adds a field, and a missing field does not
look like a bug — it looks like a replay that drifts when you rewind. The
test plays, photographs, plays on, restores and replays the same stretch, and
demands the **entire** photo comes out identical.

### The look travels with the run

A replay used to be painted with whatever **the viewer** was wearing: skin,
colour and — for shop items — nothing at all, since `lookFor` bailed out
while `replaying`. Somebody else's shared run showed up in your skin and your
colour, which is watching a stranger's recording with your own face on.

Now the recording stores, per player, `{ s: skin, c: colour, a: accessory,
x: effect }` (`rep.aspectos`), and `montar` hands them to `newGame` as
`colors`/`skins`/`looks` — the same door online games already used for the
handshake, so nothing in the drawing code changed. `Replay.salir` clears
those three, or the next local run would be played wearing somebody else's
skin.

In the text format the look is an **eleventh field at the end**, so replays
recorded before it (ten fields) still read exactly as they did and simply
come back without it, painted the old way. The field is strict —
`skin.colour.accessory.effect` per player, comma-separated, colour in plain
hex — and anything that does not match the shape makes the whole replay
invalid, because a link that has been through a chat app can arrive with
junk glued on the end. What does match is still sanitised against
`CFG.SKIN_IDS`, `CFG.ACCESORIO_IDS` and `CFG.EFECTO_IDS`: an unknown skin
falls back to the classic Pac-Man rather than drawing nothing.

Network replays already carried names, colours and skins; they now carry
`looks` too (`lk` in the JSON header, optional, so old ones still load).

### Storage

`CFG.REPLAY_KEY` (`pacman-topmundial-repeticiones`) holds a list of
`{ id, t, j, p, lv, b, s }`, newest first: `s` is the serialised text and
`b = 1` marks the personal-best replay for that player count, which is never
pruned while there is anything else to drop. `CFG.REPLAY_MAX` (8),
`CFG.REPLAY_MAX_CHARS` (24000, one replay) and `CFG.REPLAY_TOTAL_CHARS`
(90000, all of them) bound the size, and a failed `setItem` drops the oldest
and retries. `Replay.paraPartida(fila)` matches a `PM.History` row to its
replay by score, player count and timestamp (both are written in the same
`closeRun`, milliseconds apart) — that is what puts the `VER` button in
TOP MUNDIAL → TUS PARTIDAS.

### Online games: the network format (v2)

Input replays cannot work online. There the host simulates and the guests send
**positions** (`gevt`/`pos`), not keys, so replaying anybody's keys rebuilds
nothing. What online *does* have is a stream that already tells the whole
story: the snapshots and events the host broadcasts. Those are recorded as-is
(`Replay.redCuadro` from `netMaintain`, `Replay.redEvento` from `hostEvt`,
**host only** — a guest sees only what reaches it), and watching one puts the
game in **spectator** mode fed from a file instead of a room, so playback
reuses the watch-a-friend path that already existed. Between snapshots the
spectator dead-reckons exactly as in a live game, so 6 Hz still looks smooth.

Size is the whole design constraint: raw JSON is ~470 KB per minute. Each
snapshot is flattened into a **fixed-order numeric vector** (no keys,
`aplanaSnap`/`montaSnap` — the order *is* the contract; new fields go at the
end and bump `CFG.REPLAY_NET_V`) and stored as its **delta against the
previous one** in base 36 with zero-runs collapsed, since almost nothing
changes between consecutive snapshots. That plus recording 1 in
`CFG.REPLAY_NET_EVERY` (6 Hz) leaves it at ~26 KB per minute.

The zero-run marker is `*`, **not a letter**: in base 36 a number can start
with one (`z` is 35, `z0` is 1260), so a letter marker makes a value of 35
read as "one zero" and the whole replay drifts. `Replay._codec` exposes the
pieces so the tests can hit them directly — it is the riskiest part, and a
wrong field shows up as a crooked replay, not as an error.

Pellets: the skipped snapshots' eaten cells are **accumulated** into the next
recorded frame (otherwise dots would linger), and the full map (`pm`) is kept
once per level. These live in their own store (`CFG.REPLAY_NET_KEY`, 2 games,
`REPLAY_NET_MAX_CHARS`/`REPLAY_NET_TOTAL_CHARS`) so they neither compete with
the local ones nor get pruned by their rules, and they are **not shareable by
link** — too big for a URL. `Replay.paraPartidaRed()` puts the `VER` button on
their history row; the register carries `myPoints()`, like the history row, so
a PAC-MAN VS. hunter still matches.

### Sharing by link (`supabase/repeticiones.sql`)

Both kinds are shareable, by two different routes, because only one of them
fits in a URL.

**Local (v1): the run travels inside the link.** `Replay.enlace(rep|texto)`
builds `<base>?rep=<texto>` — a few hundred bytes, no server, no expiry.

**Online (v2): the link carries a code.** ~12 KB per minute of play means a
five-minute game is 60 KB, which no chat app will pass, and compressing harder
does not change the shape of the problem. So `Replay.compartirRed(id, cb)`
uploads the serialized replay to the `repeticiones` table and returns
`<base>?rn=<CODIGO>`, 8 characters from the same no-`I`/`O`/`0`/`1` alphabet
the room codes use (`CFG.REPLAY_SHARE`). `Replay.verCompartida(codigo)`
downloads it and hands it to `verRed`, so what the recipient sees is identical
either way.

- The code is **written back onto the local register** (`reg.rn`), so hitting
  COMPARTIR twice on the same game returns the *same* link instead of leaving
  a second copy on the server and two links for one game in the chat.
- Collisions retry with a fresh code (`INTENTOS`), which with 32⁸ will never
  happen — but the day it did, the link would show somebody else's game.
- The table is **public read and public insert**, like `ranking` was before
  the Edge Function. There is nothing to forge here: a made-up replay fools
  only itself, it hands out no points and no maestrías. What it does need is
  to not become a hard drive, and that is the row size `CHECK` plus a
  20-inserts-per-minute trigger. No update, no delete: a shared replay is not
  retouched — share another one.

`UI.init()` calls `Replay.desdeUrl()`, which checks `?rn=` **before** `?rep=`
and opens the game straight into the replay, showing a dialog (game
unaffected) if the code or the text is broken. `UI.makeShareBtn` puts
COMPARTIR next to VER in TOP MUNDIAL → TUS PARTIDAS for both kinds.

### The world ranking

For the world ranking, which will carry a replay per row, the public entry
points are already there and need no change to this module:

## El PASE DE TEMPORADA (`js/pase.js` — `PM.Pase`)

The monetisation scaffold, built 19 Sep 2026 with the paid lane **switched
off**. Nothing here charges anyone and nothing can until `CFG.PASE.VENTA` is
turned on, which must not happen before the game has its own identity (see
PENDIENTE: charging is exactly what turns the Pac-Man legal risk from
theoretical into real).

### Why two lanes from day one
The mistake that cannot be undone is shipping a season as a gift and pricing
it later — that reads as taking something away. So the season ships with both
lanes visible from the start, the paid one behind a padlock. Turning it on
later adds a purchase; it removes nothing from anyone.

Whatever accrues on the locked lane is **not lost**: buying that season hands
over everything already reached, at once (`Pase.conceder`). That is what makes
it safe to leave off for months.

### The season is the month
Same calendar as the world ranking (`js/temporadas.js`): a calendar month in
UTC, nothing to open or close by hand. `CFG.PASE.DESDE` (`2026-10`) is the
first one, so through September the pass is asleep and changes nothing.

### What is stored: two counters, everything else is derived
Following the shop's rule — no new table, no saved balance:

    px_AAAA-MM   that season's experience      (suma)
    pp_AAAA-MM   1 = owns that season's paid lane (mayor)

They are **not** declared one by one. A pair per month, forever, meant a
hundred keys sitting at zero inside the achievements store — and that store is
parsed and rebuilt thousands of times a run: measured, it made every
`Tienda.saldo()` 40 % slower just to carry zeros. Instead `achievements.js`
recognises them by shape (`tipoSuelto`) and they are born the day they are
first used. The cost of that: a loose key has to be handled in the three
places that walk `STATS` — `record`, `load` (which rebuilds `c` from scratch
and would drop them on the next read) and `merge` (or syncing a device would
wipe the season). All three do. There is no list to maintain and nothing to
stretch: `CFG.PASE.DESDE` alone decides when the pass wakes up.

Everything else falls out of those two:
- **Galón** = experience / `POR_GALON`, capped at `GALONES` (30 × 1 500).
- **Coins** are never deposited. `Tienda.saldo()` adds `Tienda.delPase()` →
  `Pase.monedas()`, recomputed from the galón reached, exactly like the
  veteran gift. So they cannot be banked twice or lost in a merge.
- **Items** are marked with the same `c_<id>` counter a purchase uses, which
  is a max: `Pase.sincronizar()` is idempotent and can run any number of
  times.

The whole point: the same experience always yields exactly the same rewards,
so two devices can never disagree and reloading never pays out again.

### Experience comes from coins, on purpose
`Tienda.ganar(n)` calls `Pase.porMonedas(n)`; the rate is
`CFG.PASE.XP_POR_MONEDA` (5). There is deliberately **no second table** of
per-action values — one would have to be maintained alongside the shop's, and
the day someone tunes one and not the other the path silently drifts. Tied to
coins, balance is tuned in one place and there are never two truths. Today
that means a normal run (~60 coins) is 300 XP, a DAILY challenge 500, a full
DAILY week 4 000 — and `POR_GALON` (1 500) is set from that: four runs a day
plus the challenge is ~1 700 XP, so the 30 galones land at **~27 days**. The
target is that a daily player finishes brushing the end of the month rather
than halfway through; at 1 000 it was done in 18 days and the last fortnight
pushed nobody.

### The path (`CFG.PASE.CAMINO`)
One entry per rewarded galón, each with a `gratis` and a `pago` side; a galón
not listed simply pays nothing. Both sides can carry `monedas` and (once they
exist) an item `id`.

**Still missing: the season-exclusive pieces.** They are not drawn yet, so the
path currently pays coins only — and a pass with no skin only that month's
players own does not sell. Filling those holes is art work, not code. Chest
pieces (PLAN-COFRES.md) and shop pieces must **not** be used for it: each of
the three economies has to hand out its own things or they cannibalise each
other.

### The screen (`#pase` in `js/ui.js`)

Reached from TU CUARTEL, where the button carries the galón reached (`PASE ·
G12`) — while the season is asleep it carries no number, because that would be
a lie.

**The marquee.** Arcade cabinet header: blinking bulbs, TEMPORADA + the month
in neon, days left, and the galón in a yellow plate with the meter to the next
one underneath, which also says what that gap is worth in coins so the number
means something.

**Two lanes, one above the other, columns in the same vertical.** Every piece
is `box-sizing: border-box` for exactly that: the free lane's border is 2 px
and the pass lane's is 3, and without it the columns drifted apart.

- **Free lane** (108 px): deliberately plain — dark green, matte coin, no glow.
- **Pass lane** (178 px): the one being sold, so it is taller and dressed —
  velvet weave that drifts, gold inner edge, a light that sweeps across it,
  gold pedestal under each prize and the amount at double size.
- Between them a **band** that states what the lower lane is.
- A galón marked `hito: true` in `CFG.PASE.CAMINO` is drawn at double width.
  It is written in the config, not inferred from the amounts, because what
  makes a galón big is what is placed *on* it (the month's piece, a chest, the
  finish), not how many coins it pays.

**The two states have to be told apart from a metre away.** That is the whole
design. While the pass is not yours, its lane is shown **behind glass**:
desaturated and dimmed (`.ps-bajollave`), a fine grid over it, no sweeping
light, and a gold padlock on each prize (the lock and the grid are siblings of
the lane box, not children, so the dimming filter does not eat them). The
luxury still shows — that is what makes it wanted — but nobody can mistake it
for something already open. Buying it removes the glass, the band lights up,
past galones read COBRADO and the purchase button is replaced by the PASE
ACTIVO plate. An earlier version glowed identically in both states and read as
unlocked; that was the bug worth fixing.

**Two synced scrollers.** Each lane is its own horizontal scroller and they
mirror each other's `scrollLeft`; the band sits between them at panel width.
The path is inside the scrollers, which is why the band cannot live in there:
thirty galones are some 3 600 px wide and its centred text ended up two
screens off to the right. Both lanes are built **once** and refreshing only
swaps classes and text — rebuilding loses the sideways position every time you
come back, which with thirty galones is exactly what you want kept.

Your own Pac-Man (your colour, your skin) chews on top of the galón you are
on, drawn on a 48 px canvas like the cuartel cursor — at 30 px, on the portrait
drawing that reserves room for trail and accessory, it came out the size of a
pellet.

Asleep-season state: before `CFG.PASE.DESDE` the whole path is visible but a
warning says what is played now does not count towards it.

### Not built yet
- The season-exclusive pieces (above): art work, and the reason the path still
  pays coins only. The hito slots at 10, 20 and 30 are where they go.
- Any actual payment. `Pase.conceder(temporada)` is the hook the checkout will
  call the day one exists; nothing in the game reaches it today and the button
  stays disabled.

## Partida a medias (`js/guardado.js` — `PM.Guardado`)

A run used to exist only while its tab did: closing the page threw it away.
Now it can be left where it was and picked up later, **on another machine
included** — which is the whole point, and why it travels with the account.

**What is saved is the replay, cut where the run was.** No snapshot of the
maze, no ghosts, no pellets, no cooldowns: the game is deterministic
(`Game.seedRnd(level)`), so the recording that `js/replay.js` already keeps —
settings, starting level and the list of turns with the tick of each — *is*
the run. Resuming means replaying it at full speed up to that tick and handing
the controls back. It costs a few kilobytes (it fits in a Postgres column and
crosses machines), nothing can be half-serialised, and **a mismatch is
visible**: the recovery ends by comparing score and pellets against what was
saved, and refuses if they differ. The price is the wait — a few seconds of
off-screen simulation with a progress dialog.

`Game.step()` calls `Guardado.paso()` last, which saves every
`CFG.SAVE_EVERY` ticks (300, 5 s) and uploads every `CFG.SAVE_CLOUD_EVERY`
(3600, 1 min). The clock is `Replay.t`, so `r.t < ultimo` means a new run
started and the counters reset — without that, the run after a long one would
go unsaved for its first minutes.

### What can be continued

Whatever the replay can rebuild: `solo`, `duo`, `hab`, `habduo`, `vs` and
`habvs` — one or two players on the same keyboard, in the classic maze, an
alternative one or DESATADO. **CACERÍA is not recorded** (the machine's
Pac-Man is one seat more than the input format has room for) and **ONLINE is
simulated by the host**, so neither can be saved; `Guardado.puedeGuardar()`
returns false and the pause menu drops the button rather than showing one that
would not work.

### The envelope

`CFG.SAVE_KEY` (`pacman-topmundial-partida`) holds **one** JSON:
`{ v, rep, t, maze, p, dl, st, lv, j, modo, fecha, quien }`. `rep` is the
serialised replay with a `final` filled in with *how the run is going* (that
doubles as the front-page line); `t` is the replay tick to stop at; and
`p`/`dl`/`st` are the fingerprint the recovery is checked against.

`maze` is there because the replay format has no room for it: a LABERINTOS run
would otherwise come back in the 1980 maze. `Replay.montar(rep, extra)` takes
it as `extra.maze` and passes it to `newGame`.

### Never paid twice

A run is cashed in exactly once — XP, coins, record, history, world ranking —
and that happens in `Game.closeRun()`. Saving and cashing in are mutually
exclusive **by construction**:

- **GUARDAR Y SALIR** (`Guardado.guardarYSalir`) sets `Game.salvada`, which
  makes `closeRun` return before doing anything, and leaves the envelope.
- Closing the tab outright cashes in nothing either: nothing gets to run.
- Any real ending (GAME OVER, surrender, SALIR, REINICIAR) cashes in **and
  deletes** the envelope — but only if the run being closed was recordable
  (`Replay.enCurso()` is asked *before* `alAcabar()` clears it). A CACERÍA or
  ONLINE game deletes nothing: it is not what was saved.

### Prepared runs (`sobre.arranque`)

A normal envelope is a replay from tick zero: replaying it rebuilds the run.
Some states do not come from there — a position set up by hand to test
something, or a run rescued from before saving existed — and cannot be
rebuilt by playing, because they were never played that way.

`arranque` is the starting point the envelope departs from: `{ puntos,
pellets (hex), comidos }`. `Guardado.aplicarArranque` runs right after
mounting and before simulating anything, so the recorded entries (if any)
play out *on top of* it and the usual score/pellet check at the end still
means what it meant. Level and lives are not in there: they are run settings
and travel where they always did (`rep.nivel`, `rep.ajustes.vidas`), which
also means mounting one touches nobody's saved settings.

It sticks to the run (`Game.arranque`) so the next envelope carries it too —
without that, resuming a prepared run a second time would start the score
from zero and nothing would add up. `Guardado.titulo` appends PREPARADA, and
a prepared run is cashed in like any other when it ends: prepared counts as
played.

### Resuming (`Guardado.retomar(avance, hecho)`)

Mutes audio, sets `G.simulandoFuera = true` (the main loop stops stepping),
mounts the replay and runs `G.step()` in chunks of `CFG.SAVE_MS_TROZO` ms
until `Replay.t >= t`, reporting progress. Reaching GAME_OVER or MENU first,
or `CFG.SAVE_MAX_PASOS` steps, is divergence: `'NO CUADRA'`, and **the
envelope is kept** — throwing away somebody's run on its own is worse than
asking. Same for `'ROTA'` (unreadable text).

The check is score always, plus `dotsLeft` only when the run was saved in
`PLAYING` or `DYING`. Saved during a READY banner the recovery stops a hair
earlier — the replay clock does not run during the banner — so the maze has
not been dealt yet there; the score cannot have changed in between either way.
That also means a run saved right after clearing a level comes back showing
the level-change again, which is correct, not a bug.

Then `Replay.retomarMando()` turns `'ver'` into `'grabar'` with the entries it
already had, clears `replaying` and puts `xpSent`/`rankingSent`/`timeSent`
back to false (they were forced true so that *watching* a replay pays
nothing), and reopens the showcase. The game is left **paused** on purpose —
coming back in motion, mid-maze, with the ghosts on top of you, is a life lost
to the reunion — with `Game.retomada` naming the run in the pause menu until
it is unpaused.

**Achievements and DAILY are not re-counted** during the recovery: they are
counted as things happen, so the first half was already counted on the machine
where it was played. Counting them again would inflate them for anybody
resuming on the same machine, and counting short is less wrong than counting
double. Points are not lost: the run keeps its score and is cashed in whole
when it really ends.

### The cloud (`perfiles.partida`)

`Account.guardarPartida(texto, cb)` PATCHes the column on its own, **not
inside `push()`**: this is the only thing written *during* a run (every
minute), while `push()` carries the state left after playing — merging them
would have uploaded records and achievements that have not changed once a
minute. A 400 naming the column answers `'SIN COLUMNA'` (the project has not
run `supabase/cuentas.sql`) and the module stops insisting; the run stays
saved in this browser.

`applyRemote` hands `fila.partida` to `Guardado.desdeNube`, which keeps it
only if it is **newer** than the local one: somebody who has just played here
cannot lose it to whatever was in the cloud. `Guardado.sobre()` picks between
the two by date, except that a local envelope belonging to another account
never wins. Once resumed, the run is written locally and `deNube` is dropped,
so it stops showing as pending on the front page.

### On the front page

`UI.buildContinuarBox()` adds a **CONTINUAR** block above ELIGE MODO — in
green, not the yellow of JUGAR: two different paths, told apart at a glance —
with the run's line (`Guardado.titulo` + `Guardado.cuando`) and DESCARTARLA.
It is hidden when there is nothing, and `UI.refreshContinuar()` refreshes it
on every return to the menu, on every save and when one arrives from the
cloud. Starting a new run would throw the saved one away, so
`UI.avisaSiHayGuardada(sigue)` asks first (SEGUIR LA DE ANTES / EMPEZAR UNA
NUEVA / VOLVER) from the three places a recordable run starts: `playPick`,
the DESATADO dialog and the LABERINTOS list.

`Guardado.luego(fn)` is how the next chunk is scheduled (`setTimeout` in the
game). The tests replace it with `function (f) { f(); }` so a recovery happens
inside the test, where no clock is running.

## Nombres de jugador (nicknames)

Entered on the **title screen** (agar.io style): a "TU NOMBRE" field right
above the play buttons, bound to `nick1`. The options panel repeats it in
section "NOMBRES" ("TU NOMBRE (J1 Y ONLINE)" → `nick1`, "JUGADOR 2 (LOCAL)"
→ `nick2`). One setting may have several fields; `UI.nickInputs[key]` is an
array and `UI.refreshNicks(skip)` keeps them in sync (never overwriting the
field being typed in). Enter blurs the field. Sanitised to uppercase
`A-Z0-9 ._-`, collapsed/trimmed spaces, max `CFG.NICK_MAX` (12) chars; the
filter runs on every keystroke, the trim on blur. Empty falls back to
"J1"/"J2" (`Game.nameFor(i)`; `Game.rawName(i)` returns '' when unset).

Shown in: the HUD (1-player replaces "1UP"; 2-player keeps "EQUIPO" over the
team score and adds a third header line, name 1 left / name 2 right in each
player's colour, 7 px), above each Pac-Man during READY (replacing J1/J2),
the online lobby status, the surrender/rematch dialogs and the GAME OVER
panel. Online, the two names are exchanged in the handshake (`n` field) and
kept in `Game.netNames = [J1, J2]`; the guest always sends its own `nick1`.

Everything drawn on the 224 px canvas goes through `Game.fitText(ctx, text,
x, y, width, size)`, which shrinks the font (down to 4 px) until the name
fits its slot instead of clipping it: the "1UP" slot, each team header slot
(halves with 2 players, `(224-16)/n` with 3-4) and the READY labels. The
in-game chat lines shrink the same way when `name: text` overflows. The
server-side limit lives in the `CHECK` constraints of `supabase/ranking.sql`
(`nombre1`/`nombre2`) and `supabase/cuentas.sql` (`perfiles.usuario`,
`amigos.amigo`) — raising `CFG.NICK_MAX` means re-running both.

## Muerte por jugador (2 players: the game does not stop)

A death freezes **only that Pac-Man**, never the whole game, as long as
someone else is still playing. Per-Pac state (`js/pacman.js`): `dying`,
`deathPhase` (0 freeze / 1 animation), `deathTicks`, `deathOk` (guest: host
confirmed), `safeTicks` (respawn grace).

- `Game.startDeath(i)` marks that Pac-Man dying and only enters the global
  `DYING` state when `anyPlaying(i)` is false (the last one). 1-player is
  therefore unchanged: classic freeze → animation → READY reset.
- `stepPacDeaths(finish)` runs the freeze (`DEATH_FREEZE_TICKS`) and the
  animation (`DEATH_ANIM_TICKS`) per player; with `finish` it then calls
  `finishPacDeath(i)`: one life off the pool (shared) or off that player
  (individual), and either respawn at their own spawn with
  `CFG.RESPAWN_SAFE_TICKS` (2 s) of invulnerability — blinking, ghosts pass
  through — or `out = true` (spectator) if there are none left.
- While `dying` a player is skipped for movement, eating, fruit and
  collisions, and ghosts do not target them (`pacContextFor`). Ghosts,
  schedule, fruit, sound and the other player keep running normally; ghosts
  are only hidden during the *last* player's animation.
- GAME OVER when everybody is `out`. Shared lives thus mean: the pool runs
  out, whoever dies next becomes a spectator, and the survivor plays on.
- Online: the guest still predicts its own death (freeze + `gevt died`) and
  the host confirms with `evt death {w, g}` (`g` = it was the last one). The
  guest never applies the host's `pd` for its *own* Pac-Man (the host always
  sees that death start and end later, so copying it would restart the
  animation in a loop); if the confirmation does not arrive within
  `CFG.DEATH_CONFIRM_TICKS` the prediction is rolled back. While dying the
  guest **keeps sending `pos` at the usual rate but flagged `dy:1`**: the host
  ignores the position of a `dy` message (its frozen spot would drag the pac
  back after respawning) yet still counts it as a sign of life. Going silent
  instead starves the host's watchdog, which after `WAIT_TICKS` freezes the
  whole simulation — i.e. one player's death animation stops the other's game.

## Skins, emotes, maestrías, ranking y chat

**Skins** (`CFG.SKINS`, settings `skin1`/`skin2`), 54 of them in five
`grupo`s: **nivel** (player level, ladder 1·2·4·6·8·10·12·15·18·22·26·30·34 in
the order Braighton picked), **logro** (`pide: {stat, meta}` on a
`PM.Achievements` counter, or `{ruta:[...], maestria}` on a badge track),
**temporada** (`pide: {fecha}`; `CFG.SKIN_FECHAS` halloween 24–31 Oct, navidad
20 Dec–6 Jan), **tienda** (coins) and **cofre** (chest-only, see below).
`rara: true` marks the "extravagant" ones that drop the Pac-Man shape (their
eating is a jaw, a lid, a bun, a beam); the seven **material** skins added on
17 Sep (LAVA, HIELO, CHICLE, PLASMA, ENJAMBRE, GALAXIA, AGUJERO NEGRO) are not
`rara`: they are drawn inside `pacPath` (helpers `dentro()`/`borde()` in
skins.js) in SCREEN space, so the silhouette and the mouth stay the game's and
accessories need no `CABEZAS` entry.

- **Chest wardrobe** (17 Sep, `PLAN-COFRES.md`). Items flagged `cofre: true`
  (or a skin with `grupo: 'cofre'`) are owned through the same `c_<id>`
  counter as a purchase, but they are not for sale: `Tienda.CATALOGO` holds
  everything ownable and **`Tienda.VENTA`** (what the shop lists) filters them
  out, their `precio` is 0, `Tienda.comprar` refuses them and
  `Tienda.esDeCofre(id)` reports it. `Skins.estado` gives them the chip
  `COFRE` / `COFRE LEGENDARIO` and the wardrobe has a `cofre` filter. Until
  chests exist nothing sets those counters, so they simply show locked.

- **Drawing.** `Sprites.drawPacman(ctx, x, y, dir, mouth, color, skin, extra)`.
  The original six (`clasico`, `sombra`, `ojos`, `neon`, `pixel`, `aro`) are
  still drawn in sprites.js; the other 26 live in **`js/skins.js`**, which
  registers them in `Sprites.ARTE` and `drawPacman` diverts to
  `Sprites.dibujarArte` before touching anything. `extra` is optional:
  `t` (seconds — in game `tick/60 + i·0.37`, so spectators and replays match),
  `back(dist)` (point of the path behind), `estira` (trail stretch), `team`
  (teammate colours, ESCUADRA), `muerde` (Q active), `mordio` (that Q hit
  something) and `icono` (menu/lives: no trails). With no `extra` a skin still
  draws (straight trail, clock since skins.js loaded). **Never pass
  `Date.now()/1000` as `t`**: at ~1.8·10⁹ the canvas loses arc precision and
  angle-driven arcs vanish (RASTRO's discs did); the showcase counts from when
  the panel opens.
- **Trails follow the real path.** `Pacman.huella` records `{x,y,d}` each
  update (≤160 points; a jump >12 px — tunnel, FLASH, net correction — clears
  it) and `Pacman.atras(dist)` walks it back, stopping at the oldest point.
  `Pacman.velPx` is the smoothed speed; `Game.pacExtra` turns it into
  `estira = 1 + (velPx / (0.8·BASE_SPEED) − 1)·2`, clamped 0.5–3, so turbo
  doubles a trail. SOMBRA, COMETA (more copies, not wider gaps), RASTRO and
  FUEGO's flames use it.
- **Q on extravagant skins.** The white saw of `drawPacTeeth` is skipped for
  `rara` skins (it would float outside their face); they open fully instead
  (`extra.muerde`). Three have their own Q act and **only on a Q that hits**
  (`Hab` state `mordio`, set by `marcarDientes` without ticks; a miss passes
  half ticks and leaves it false): DRAGÓN breathes fire (a miss only snorts a
  smoke puff forward; idle, smoke wisps rise from the nostril), COFRE throws a
  shower of 26 glowing coins around it (born outside the chest), OVNI turns on
  the tractor beam. The showcase fakes those three (`Skins.CON_Q`): every 3 s,
  a hit for 1.1 s and then a miss for 0.7 s.
- **The eater stays visible in DESATADO.** The arcade hides Pac-Man during the
  ghost-eaten points freeze; with `Game.hab` it is drawn anyway, since there
  the Q bite is exactly what must be seen.
- **Death.** `Game.render` uses `Sprites.drawSkinDeath(ctx,x,y,t,color,skin,dir)`
  for any skin but `clasico` (spin-shrink, flicker, burst of sparks in the
  player's colour); `clasico` keeps `drawPacmanDeath`.
- **Sounds.** `AudioSys.playWaka(skin)`: the twelve in `WAKAS` (the eleven
  extravagant ones plus DORADO) have their own two-hit chomp, all under
  ~110 ms (noise bursts, bell partials, formant sweeps; DRAGÓN is a deep sine
  thump with a soft low rumble, no sawtooth); every other skin keeps
  the classic "wa-ka". `eatAt`/`guestEatAt` pass the eater's skin.
  `AudioSys.tieneWaka(skin)` puts an ESCUCHAR button on those cards.
- **Unlocking** is `PM.Skins.estado(id)` → `{abierta, pct, progreso, chip}`;
  `Level.skinUnlocked/skinsAllowed` delegate non-level skins to it. The worn
  skin is always allowed. New counters in `Achievements.BASE`: `muertes`
  (own lives lost — host/local in `startDeath`, guest on the `death` event;
  seeded once with `floor(partidas × 2.5)`, flag `k`, re-seeded as a max on
  account merge), `top10` (set by `Skins.anotarTop10` when the individual
  all-time ranking loads, or once per session when the SKINS panel opens),
  `halloween` / `navidad` (set in `closeRun` via `Skins.anotarTemporada`).
  They travel to `perfiles.logros` like every counter.
- **"SKIN NUEVA" notices.** `Skins.reclamar()` returns skins opened since the
  last look (`localStorage` list); `Game.anunciarSkins` pushes them to the
  achievement band after `bumpAch` and after the level XP in `closeRun`.
  `Skins.syncVistas()` at boot and after an account merge, so nothing old is
  celebrated.
- **UI: the VESTUARIO** (`#vestuario`, 15 Sep; it replaced the SKINS panel).
  See **VESTUARIO** below.
- Exchanged online in the handshake (`k` field → `Game.netSkins`); an old
  client that does not know an id draws `clasico`.

**TIENDA** (`PM.Tienda`, `js/tienda.js`, `CFG.TIENDA`, panel `#tienda`),
approved 2026-09-15. Coins only, no real money.

- **Catalogue.** `CFG.EMOTES_TIENDA` (7, 150), `CFG.EFECTOS` (10, 250),
  `CFG.ACCESORIOS` (11, 450) and the `grupo: 'tienda'` skins of `CFG.SKINS`
  (5, 1 500: `cuy`, `llama`, `carro`, `oso`, `galleta`). Level, achievement
  and season skins are never sold.
- **The balance is never stored.** Two monotonic counters live in
  `PM.Achievements` (so they reach `perfiles.logros` with no schema change):
  `monedas` (total earned, `suma`) and one `c_<id>` per item (`mayor`, 1 =
  bought, generated from the catalogue). `saldo() = INICIALES (1 500) +
  monedas − Σ price of owned`. Merging accounts keeps the best of each side,
  so it can neither duplicate coins nor lose a purchase; spending the same
  coins offline on two devices leaves a negative balance that blocks buying.
- **Veteran gift** (`bono`, added 15 Sep, option A chosen by Braighton): a
  one-off `5 × partidas + 50 × achievements`, uncapped
  (`CFG.TIENDA.VETERANO_*`), so people who played before the shop do not start
  level with newcomers. `saldo()` adds `Tienda.regalo()`. It is its own
  `mayor` counter, not part of `monedas`, so merging devices keeps the larger
  gift instead of adding them. `Achievements.sembrarBono()` computes it once
  per device (flag `b`, after the mode/daily/deaths seeding because it counts
  achievements) and then it is frozen. `merge()` only lowers the flag when the
  cloud row carries **no** gift, so an account's full history is used the
  first time; once any device has pushed a gift, it is never recomputed. The
  TIENDA panel shows the line `REGALO DE VETERANO: +N`. Real accounts on
  launch: IAMBRAIGHTON 4 930, MAULIO 1 300, SANDROPEPA 890, FREDDY 710,
  PIEROSENSUAL 690, SANDROPEPAS 355 (counted after mode seeding, so slightly
  above a raw count of the cloud JSON).
- **Earning.** `closeRun` pays `Tienda.dePartida(myPoints, timeTicks/60)`: 5 if
  the run lasted ≥ 60 s (restarting must not pay) + 1 per 1 000 points, capped
  at 40. `Daily.premiar` pays 20 per challenge and 150 for a full week.
  `runSummary.monedas` is the difference in `ganadas()` since `newGame`, so it
  includes DAILY coins earned during the run. Replays and spectating pay
  nothing.
- **Worn items** are settings of the device, like the skin: `acc1`, `efx1`,
  `emotes1` (six face ids, keys 1..6). `Tienda.accesorio/efecto/emotes`
  ignore anything not owned; `ponerEmote` swaps so a face never sits on two
  keys. Only player 1 wears them locally.
- **Drawing.** `Sprites.drawPacman` diverts to `Sprites.dibujarLook` when
  `extra.efecto`/`extra.accesorio` is set: the effect (`Sprites.EFECTOS`) wraps
  the skin via a `cuerpo()` callback and draws its particles at fixed path
  positions (`extra.s` = `Pacman.recorrido`, `back`), CHISPAS fires on turns
  (`extra.giro` = px since `Pacman.giroEn`), CONFETI on eating a ghost
  (`extra.confeti` = seconds since `Game.confetiTick[i]`). Accessories
  (`Sprites.ACCESORIOS`) are drawn in the body frame on top. No effect on
  icons.
- **Cross-over** (15 Sep): every skin wears every accessory and effect.
  Accessories are drawn for Pac-Man's head (circle of radius R at the frame
  centre, eye at (1.1, 3.7)); each extravagant skin has an entry in
  `CABEZAS` (in `js/skins.js`): its `ojo`, its head scale `k` and optionally
  its `coronilla` and `cuello`, measured by eye in the frame (f forward, s up).
  `anclaAccesorio(skin, acc)` returns the translate/scale for the accessory's
  zone (`ZONA_ACC`: hats → crown, bow tie → neck, the rest → eye). A hat's
  base (`BASE_SOMBRERO`, in Pac-Man head units: chistera R−1, gorra R−2,
  vikingo 2.4, hélice 3.6) is set 1 unit below the crown, so hats that hug
  Pac-Man's ball (hélice, vikingo) rest on top instead of sinking into the
  body. Face items are placed by their own reference point (`PUNTO_ACC`) and
  where it must land relative to the skin's eye (`DESDE_OJO`, in head units):
  the patch's centre **on** the eye, the headband on the forehead, the
  moustache below the eye toward the snout and the ear cup behind the eye —
  in Pac-Man all of them work off one round head, but an elongated one needs
  each item taken to its own spot (reviewed skin by skin on 15 Sep). A skin
  can pin an item by hand with `sitios` (CALAVERA's, ROBOT's, LOBO's and
  CARRO's moustache, CARRO's headphones); and
  `dibujarLook` applies it before drawing. `admiteAccesorio` is true for
  Pac-Man-shaped skins and for any extravagant one listed in `CABEZAS` (all
  26 today); a new extravagant skin needs its entry, or it shows no
  accessory.
- **The accessory moves with its piece** (`POSES`, `deltaPose`). The heads
  were measured in one pose (`POSE_MEDIDA`: t 0.3, mouth closed). `POSES`
  repeats, as a `DOMMatrix`, the transforms each skin's drawing applies to the
  piece the accessory sits on (bob, sway, hop, the Q jump of CUY/CARRO...),
  and `dibujarLook` applies `now × measured⁻¹` before the anchor. Skins that
  open by **lifting the top** rotate the `cara`/`cabeza` zones with it:
  HAMBURGUESA's top bun, COFRE's lid, PLANTA's upper lobe (the `cuello` zone
  follows the lower lobe), and LOBO's whole head while howling. The mouth
  phase uses the same `half` as `dibujarArte` (full open with the Q). A skin
  whose drawing changes those transforms must change its `POSES` entry too.
  Without `DOMMatrix` (the Node fake DOM) the accessory is drawn static.
- **Network** (`CFG.NET.PROTO` 9): party members carry `a`/`x`
  (`Party.me`), `gameOrder` passes them, `UI.lookDeRed` sanitises them into
  `opts.looks` → `Game.netLooks` → `Game.lookFor(i)`; spectators get `lk` in
  `svista`. Emotes travel as the **face id** (`e: 'chulo'`); an index is still
  accepted and translated (`Game.emoteId`).
- **UI: buying only.** Tabs EMOTES / EFECTOS / ACCESORIOS / SKINS, the
  balance, one card per item animated with `Skins.escena(..., {efecto,
  accesorio, emote})` and its magnifier; buying takes two clicks (the first
  asks). **Owned items are hidden** unless VER LO QUE YA TENGO is on, except
  the ones bought during this visit (`UI.tiendaRecien`), which stay with
  PONÉRTELO: `UI.tiendaPonerse` equips (an emote goes to the first key holding
  a base face, else key 6) and opens the VESTUARIO on that tab. Nothing is
  equipped or removed from the shop itself any more.

**VESTUARIO** (`#vestuario`, TU CUARTEL button, approved 2026-09-15). The one
place to dress the character. Before it, colour/avatar/worn skin lived in
PERFIL, all skins in a SKINS showcase and accessories/effects/emotes were
equipped from the shop, and none of them listed only what you own.

- **Two rules.** (1) Only what you own is listed; VER LO QUE ME FALTA adds the
  rest, dimmed, with how to get it. (2) Clicking an owned tile wears it at
  once; clicking one you do not own **tries it on** (`UI.vestProbando`): the
  mannequin wears it and the detail card shows the progress or price, with
  COMPRAR EN LA TIENDA for shop items.
- **Layout.** Left, the mannequin (`vestEscena` 336×144 + `vestLupa`, animated
  by `animarVestuario` only while open), the LLEVAS list (each row opens its
  tab) and the six emote keys. Right, tabs SKIN · COLOR · ACCESORIO · EFECTO ·
  EMOTES · AVATAR, a grid of tiles (`vestItems(tab, para)` is the single data
  source) and a detail card. Narrow screens stack them.
- **Skin classification** (`VEST_FILTROS`, `vestFiltro`): TODAS · POR NIVEL ·
  POR LOGRO · EXTRAVAGANTES · FECHAS ESPECIALES · DE TIENDA, each with
  owned/total. The category is `vestItems(...).cat` (`rara` = `logro` + `rara`;
  otherwise `grupo`, so vampiro/lobo count as FECHAS and the shop skins as
  TIENDA). TODAS renders the groups with a `.vest-seccion` title.
- **Colour tab** (`makeColorTiles`): one tile per `CFG.PAC_SWATCHES` colour
  with the worn skin painted in it (`pintarColorTiles`) and its name
  (`VEST_COLORES`), plus A TU GUSTO, a tile covered by an invisible
  `<input type="color">`. The tiles register in `colorRows` like the old
  swatch rows, so `refreshColorRows`/`setColor` are unchanged.
- **Player 2.** The TÚ / JUGADOR 2 switch (`vestPara`) edits `skin2` and
  `pac2Color`; the other tabs are hidden (player 2 wears no shop items).
- **NUEVO.** `localStorage` list `pacman-topmundial-vestuario-vistos` of
  `tab:id`. First run seeds it with everything owned, so only later
  unlocks/purchases are new. Tiles shown as new are marked seen when leaving
  the tab or the panel (`vestMarcarVistos`). The cuartel button reads
  `VESTUARIO · N NUEVOS` (`refreshVestBtn`, on `showMenu`).
- **Elsewhere.** PERFIL keeps who you are (name, level, account, logros) plus
  a TU PERSONAJE mini with ABRIR EL VESTUARIO; OPCIONES · JUGADORES has two
  shortcuts. `showSkins(key)` still works and opens the vestuario. VOLVER/Esc
  return to the panel it was opened from; shop ↔ vestuario do not bounce.
  Settings are the same as before (`skin1`, `skin2`, `pacColor`, `pac2Color`,
  `acc1`, `efx1`, `emotes1`, `avatar`), so nothing is lost.

**Tanda del 14 de septiembre** (in game since 2026-09-15): `bomba` (`vs:cazas`
3), `abisal` (`nivelMax` 10), `pinata` (`dailySemana` 1), `tostadora`
(`dailyRacha` 3), `gargola` (`lab:partidas` 5), `pulpo` (`muros` 25), `momia`
(`limpios` 5), `globo` (`racha` 5), `bicefalo` (MAESTRO on `hab2`) and `lobo`
(`pide: {luna: true}`: a game played at night, 18:00–06:00 local, within
`CFG.LUNA.MARGEN_DIAS` of a mean-cycle full moon; `Skins.lunaLlena`, recorded
as `lunallena` in `anotarTemporada`). Their Q and the shop skins' Q run for
their own duration off `qDe(o, dura)`, fed by `extra.qSeg` = seconds since the
last **hitting** Q (`Hab` state `qEdad`). **Own deaths:** `drawSkinDeath` passes
`o.muerte` (0..1) to the 15 skins in `MUERTE_PROPIA`; `conMuerte()` renders the
unchanged skin into an offscreen canvas and moves, burns, breaks or erases it
(`bomba` and `galleta` do it inside their own drawing). The art is the one
approved in the showcase artifact, extracted verbatim.

**Emotes** (`CFG.EMOTES`): six **drawn Pac-Man faces**, not words —
`risa`, `llanto`, `enfado`, `susto`, `guino`, `amor`. `Sprites.drawPacFace`
renders them procedurally: body in the player's own colour plus black
features on top (arc/dot eyes, eyebrows, mouth shapes, cyan tears, heart
eyes), so they read at 8 px tiles and identify who sent them. The array
order **is** the key order: `1..6` fire the emote at that index (and the
EMOTES bar shows each face with its number in the corner, drawn on a mini
canvas in the local player's colour). `Game.sendEmote(i)` shows the bubble
(`Sprites.drawEmote`) over that Pac-Man for `EMOTE_TICKS`, with an
`EMOTE_COOLDOWN` antispam gap.

Both take an optional `tick` (free-running frame counter) and **animate**:
the laugh bounces and its mouth opens, the crier drips two staggered tear
streams, the angry one trembles, flushes red and vents steam, the scared one
shivers with darting pupils and a cold sweat drop, the wink opens the eye
now and then with a sparkle, and the love hearts beat while little ones
escape upwards. `drawEmote` also bobs the balloon by whole pixels (so the
1 px border stays crisp) and clips its inside, so nothing animated leaks
into the maze. Passing no `tick` draws the still pose — that is what the
PERFIL avatars and thumbnails use. The EMOTES bar animates its faces with a
`requestAnimationFrame` loop that only runs while the bar is open
(`UI.refreshEmoteFaces` starts it, `UI.drawEmoteFaces(tick)` paints a frame).

Available in every mode. Online: guest
`gevt {t:'emote', e}` → host re-broadcasts `evt {t:'emote', w, e}`; each side
ignores the echo of its own.

**Enseñar la maestría**: `Ctrl+Espacio` (or the MI MAESTRÍA button in the
emote bar, for touch) puts your highest badge **of the current mode's track**
over your own Pac-Man. `F1`..`F4` (or the SOLO · DÚO · TRÍO · ESC. buttons)
do the same for the 1..4-player track **of the world being played**
(`Game.sendBadgeTag(n)` → `Badges.ruta(recordSlot(), n)`; browser default
suppressed). The format travels as `f` in `gevt/evt {t:'badge', b, f}` and is
drawn as a small tab above the tag (`drawBadgeTag`'s 9th arg) for 2..4 players
(the solo badge stays plain); an event
without `f` (older client) draws no tab —
`Sprites.drawBadgeTag`, same bubble as the emotes with the medal and the
badge colour, sharing the emote slot (`{tag, color, ticks}` instead of `{e}`)
and cooldown. Badges are per-device, so the wire carries the **id** and the
receiver looks it up in `CFG.BADGES`: guest `gevt {t:'badge', b}` → host
`evt {t:'badge', w, b}`, same echo guard. An empty id means "SIN MAESTRÍA",
which is what a player with no badge yet shows. Works in every mode.

**Maestrías** (`PM.Badges`, `CFG.BADGES`): six tiers (APRENDIZ 3 000 → TOP
MUNDIAL 100 000) on **twelve independent tracks** — a **world** (where you
play) crossed with a **format** (how many of you play) — so a big squad run
never hands out the duo or the solo badges, and neither does a run in another
maze, nor a trio in another maze the badges of a solo one:

| world | × | format | × | record |
|---|---|---|---|---|
| `'clasico'` | 1 | `1` SOLO | 1 | `Game.recordFor(n)` |
| `'lab'` | 1 | `2` DÚO | 2 | `Game.recordModo('lab', n)` |
| `'hab'` | 2 | `3` TRÍO | 3 | `Game.recordModo('hab', n)` |
| | | `4` ESCUADRA | 4 | |

Track ids are chosen so nothing already stored breaks: the classic ones are
the old `'solo' | 'duo' | 'trio' | 'escuadra'`, and each other world's **solo**
track keeps its old id (`'lab'`, `'hab'`). Only `'lab2'..'lab4'` and
`'hab2'..'hab4'` are new. `Badges.ruta(world, players)` builds one,
`mundoDe/players/mundoName/formatoName/modeName` take one apart.

**Each record is its own league** — `Game.recordFor(n)` / `setRecordFor(n, v)` /
`recordKey(n)` resolve the classic formats; `recordModo(id, n)` /
`setRecordModo(id, v, n)` / `recordModoKey(id, n)` the other two worlds, backed
by `Game.recordsModo = {lab:[4], hab:[4]}` and keyed in localStorage by
`CFG.recordModoKey(id, n)` (**no suffix for solo**, so an existing value lands
on the solo track — which is where nearly everybody set it). `Game.recordSlot()`
says which **world** the current run belongs to (`'lab' | 'hab' | null`);
the format is just `playerCount`. `persistHighScore` writes exactly one cell
and `newGame` shows that league's record as the in-game HIGH SCORE.
`Game.badgeMode()` = `Badges.ruta(recordSlot(), playerCount)`.

> This closed two real holes. First, a LABERINTOS run used to write into
> `highScore1` — the same record that travels to the account and feeds the
> maestrías — so an easier layout handed out badges for the 1980 maze. Then,
> once those worlds had their own record, a **trio** in another maze still
> handed out the same badges as a solo run, which is three mouths eating for
> the price of one. Old `record1` values are left alone: there is no way to
> tell which part came from an alternative maze.

**The bar rises with what the run gives away**: `Badges.goal(badge, mode)` =
`base × Badges.mult(mode)`, where the base is **the world's own table** when it
has one and `badge.points` otherwise, and the multiplier is **the format's
times the world's**. Formats multiply by `FORMATOS[].mult` — ×1 solo, ×1.25
duo, ×1.5 trio, ×1.75 squad (APRENDIZ is 3 000 / 3 750 / 4 500 / 5 250), result
rounded. It used to be the player count (×2/×3/×4), dropped on 2026-09-12:
the maze holds the same points however many play, and real team records came
out close to solo ones (DESATADO: 110k solo vs 74k/68k/64k), so team badges
were near-unreachable. A team only buys endurance (more lives, respawns),
which is what the quarter steps pay for. The `hab` world does not multiply: it
carries **its own ladder** — 5 000 / 15 000 / 30 000 / 55 000 / **100 000** /
175 000 — higher than the arcade's, because biting ghosts on a keypress prints
points the arcade never had and without that toll the track would be over in an
afternoon. It is a table rather than a factor so the figures stay round.
`lab` keeps the base figures. The dearest track is a DESATADO squad (×4 on top
of its own ladder: TOP MUNDIAL at 700 000).

All twelve travel to the account (`perfiles.record1..record4`, `record_lab`,
`record_lab2..4`, `record_hab`, `record_hab2..4`), so the tracks follow the
player from one device to the next (see **Cuentas**). A Supabase project
missing some of those columns is not a failure path: `Account` spots the 400
that names them and raises the matching flag — `sinModos` for the two original
mode columns, `sinModosFmt` for the six per-format ones — and keeps uploading
everything else. The per-format check runs **first**, because `record_lab3`
also matches the pattern for `record_lab` and would otherwise raise the wrong
flag and silently stop saving the solo tracks too.

Every API takes the track (`best/earned/top/next/has/claim/goal/players/
mundoDe/modeName`), and `Badges.modeFor(players)` is still there for the
classic world alone. Earned badges are derived from the record, so nothing can
desync; localStorage (`CFG.BADGES_KEY`) only stores which ones were already
announced, keyed by track id — an old flat array is migrated into **solo and
duo only** (the two tracks that existed), so nothing gets re-announced and the
new tracks start clean.
`Game.checkBadges()` runs on **every score change**
and announces **only what you did not already hold** (`Badges.claim` returns
the highest un-announced tier, or nothing): re-celebrating tiers you already
had meant a banner every single game, and in a party that is five seconds of
somebody else's maze covered for a medal that isn't theirs.

It is always drawn as a narrow strip at the very top, outside the maze
(`Sprites.drawBadgeStrip`, entering from the **left** so it never reads as the
achievement band, which enters from the right). Playing alone it used to be a
full banner across the maze; that was dropped — the banner sat over the ghost
house for five seconds at the exact moment you had just set your best score
and were about to lose it, and celebrating something must not cost you the run
that earned it. Badge and achievement share the top slot, so `stepBadgeNotice`
**holds** the badge (its ticks do not run) while an `achNotice` is on screen
and `renderStateText` skips it. The guest also gets it when the snapshot
brings the score.

The MAESTRÍAS panel picks a track by its **two axes** rather than listing all
twelve: a `.tab-row` of worlds (CLÁSICO / LABERINTOS / DESATADO) over a
`.tab-row.tab-row-sub` of formats (SOLO / DÚO / TRÍO / ESCUADRA). Three buttons
plus four read at a glance; twelve in a row do not. `UI.showBadgeTab(world, n)`
changes **one** axis (pass `null` for the other) or takes a whole track id and
splits it, then `UI.badgeTab` holds the resolved track. Only the sub-row is
sticky-free and carries the divider — the two rows are one decision cut in
half, not two sections. Each track lists the six tiers **with its own figures**:
its record, its
scaled goal per tier and what is missing for the next one. Layout is
**list + stage**: the six tiers on the left (one column, `.badge-split`
overrides the two-column rule the other `.badge-list`s get at 1000 px), the
picked one **large** on the right (`.badge-stage`); narrow screens stack them
with the stage on top (`order: -1`). There is no `VER` button any more — the
row **is** a `<button>` (`.badge-pick`), so pressing it picks the tier and
arrow-key navigation reaches it for free. `UI.pickBadge(id, play)` marks the
row (`.sel`), writes the stage caption (TU MAESTRÍA / CONSEGUIDA / what is
missing) and either plays the tag (`UI.playBadgeDemo`, which advances by a
**capped** per-frame delta so a throttled browser slows it down instead of
skipping it) or leaves it at rest (`UI.drawBadgeRest`: your Pac-Man with the
medal floating above, dimmed when the tier isn't yours). The demo canvas is
130 × 50 logical px at **triple** scale, shifted up by `UI.badgeTop` so the
empty band above the tag isn't drawn. Opening the panel defaults to the tier
you hold (`Badges.top(mode)`, or the first one if you hold none) and plays it;
switching tabs re-defaults without playing. `Ctrl+Espacio` shows the badge of
the **mode being played**.

**Showing off the badge in-game** (`Sprites.drawBadgeTag`, `t` from the
emote's remaining ticks): it has its own animation, deliberately **not** the
panel banner's — the medal rises **centred over the player**, the plaque then
**unrolls to its right** out of the medal (which slides into its slot), and it
shrinks back toward the player to leave. Face emotes keep their instant
balloon.

**How much pomp depends on the tier** (`rango`, the 8th argument: 0 APRENDIZ …
5 TOP MUNDIAL, defaulting to 2 so old callers are unchanged). One animation
for all six meant reaching TOP MUNDIAL looked exactly like APRENDIZ. The
`POMPA` table in `sprites.js` holds one row per tier and **each step only adds
to the one below** — never replaces it:

| tier | shape (`chapaPath`) | adds |
|---|---|---|
| APRENDIZ | rectangle | nothing: the medal rises straight, the plaque unrolls |
| CAZADOR | rectangle | one medal flip (edge-on frames draw the plain back) + spark burst |
| EXPERTO | bevelled corners | double flip + the glint that sweeps the medal (what all six used to get) |
| MAESTRO | hexagon (a point per end) | shockwave ring + second breathing frame + sparks falling off the plaque |
| LEYENDA | **shield** behind the medal + pennant (swallowtail right) | rotating ray fan behind + stars orbiting the medal + name typed letter by letter + medal halo |
| TOP MUNDIAL | bigger shield, double edge and crowned, with the serrated pennant coming out of it | white flash on landing + more of everything + a shine sweeping the name |

The silhouette is one path built at the same box, so text and medal never move
— but the ends that bite inwards need room: `padR` goes 6 → 10 for the
pennant's swallowtail, and TOP MUNDIAL's shield pushes `padL` 15 → 20 so the
first letter doesn't climb onto it. The second frame (`marco`) and the stroke
reuse the same path, and the tips shrink with the plaque (`min(5, w * 0.25)`)
so the shape holds while it unrolls instead of folding over itself.

The **shield** (`escudo`: 1 on LEYENDA, 2 on TOP MUNDIAL) is not part of that
path: it is drawn after the plaque and before the medal, scaled by the same
`abre` so it unfolds with the ribbon, and it sticks out above and below the
band — that is what takes the top two out of the "one more band" family. Tier
5's is bigger, carries a second inner edge and wears the crown (which moves up
from the medal to the top of the shield); tier 4's is smaller and plain. Its
tip points at the player, so both skip the little tab the others draw, and
`padL` grows to 18/20 accordingly.

`Game.badgeRank(id)` turns the badge id into the tier and stores it in the
emote (`rango`), so it also travels right over the network — the id is what is
sent and each end resolves the tier locally. In the panel, `UI.playBadgeDemo`
passes the picked tier, which is why the demo canvas leaves room above the
plaque (`badgeTop`): the rays and the flash spill out of it.

**Top mundial** (`PM.Ranking`): games are posted through the `enviar-record`
Edge Function; reads go to Supabase via PostgREST with the anon key — no SDK.
There is **one board per format**, told apart by the `jugadores` column: `1`
individual, `2` duo, `3` trio, `4` squad, with `nombre1..nombre4` and the
unused ones NULL (`ranking_nombres_chk` enforces exactly as many names as
players). Trio and squad games used to be dropped on the way out
(`playerCount > 2` returned early) and the table only allowed 1 and 2, so they
never left the player's browser; now every format has its own board, matching
its own record and its own mastery track. Reads go to the **`ranking_top`
view**, which keeps only each player's/team's best run (`distinct on
(jugadores, equipo)`, where `equipo` concatenates the names present) —
otherwise whoever plays most fills the whole table with repeats.

The panel's tab ids are **the player count for `1..4`**, plus `5` NIVEL 1 and
`0` TUS PARTIDAS (local first, cloud too when there is an account). Id `6` was
RETO DE HOY and went with the mode. The season row shows on `1..4` only. Switching fast is guarded by a request token, so a late reply
from the previous tab cannot overwrite the current list.

`Ranking.jugadores(n)` clamps a format, `Ranking.COLS` is the shared column
list and `Ranking.nombresDe(fila)` returns the names present, so one render
path draws a solo run and a four-name squad alike.

In the Edge Function the **points ceiling is unchanged** by player count — a
level holds the same pellets, ghosts and fruit however many mouths are eating
— but the **time floors are divided by the players** (`MIN_MS_POR_NIVEL /
jugadores`, `MAX_PUNTOS_POR_S * jugadores`): four Pac-Men clear a level in a
quarter of the time, and without that a legitimate squad would be rejected as
`TIEMPO IMPOSIBLE`.

**Anti-spam y nombres**: a `before insert` trigger caps 5 rows per name per
minute (it is not anti-cheat — that would need an Edge Function — but it
stops flooding). `Ranking.nameAllowed()` rejects `CFG.BAD_WORDS` on a
normalised name (uppercase, leet digits folded back to letters, symbols
stripped), so a public board cannot be filled with insults; the GAME OVER
panel explains it. Local play is unaffected: the filter only gates the board.

**Historial** (`PM.History`, `CFG.HISTORY_KEY`): the last `HISTORY_MAX` games
of this browser, saved on every game over **regardless of name or network**,
shown in the TUS PARTIDAS tab (works offline).

**Con cuenta the panel also reads the cloud.** The data was already in
`ranking`; `History.remote()` fetches it with
`or=(nombre1.eq.X,…,nombre4.eq.X)` — your games as a party *guest* are in
`nombre2..4`, since the host submits the team — and `History.list()` merges
it with the local rows. Only with an account: a bare nickname identifies
nobody, so fetching by name alone would show you someone else's games.

Merging has no shared id (the local row is written at game over, the
`ranking` row is stamped by the server a moment later), so `History.misma()`
pairs them by format and time (2-minute window), plus points **when there is
one player** — in a team game the local row holds `Game.myPoints()` and the
board row holds the team's. Ties go to the local row: it has your points and
the replay (`Replay.paraPartida` cross-matches by points, players and time).
`History.add` therefore stores the real player count (1..4); it used to clamp
to 1 or 2, which left a squad's own game looking like a solo run and unable
to find its replay.

**A record needs a name**: `Game.missingRankingName()` checks `rawName()`
(the real nickname, not the J1/J2 fallback) for every player involved, and
without it nothing is submitted — the GAME OVER panel says why instead of
failing silently. `Ranking.submit()` rejects nameless rows again on its side.
Only the host submits online, once per game (`Game.rankingSent`). The table lives in `supabase/ranking.sql`
(public select + insert, no update/delete — note it needs the table-level
`GRANT ... TO anon` on top of the RLS policies, or PostgREST answers 401);
if it is missing the panel says so instead of failing. Scores are client-submitted and therefore forgeable —
hardening means validating in an Edge Function.

**Chat** (online only): `T` or the CHAT button opens an input; Enter sends,
Esc closes. Messages are sanitised (`Game.cleanChat`: no control chars,
collapsed spaces, `CFG.CHAT_MAX` chars) and rate-limited by
`CHAT_COOLDOWN`. The last `CHAT_KEEP` messages are drawn over the lower maze
for `CHAT_TICKS`. Wire: guest `gevt {t:'chat', m}` → host `evt {t:'chat', w, m}`.
While the chat input has focus the game keyboard is inert.

## PAC-MAN VS. (human-controlled ghost)

`js/versus.js` (`window.PM.Versus`) turns one of the four ghosts over to a
player. The design rule is that the human ghost is *a ghost*: only the choice
of turn changes hands. Everything else stays in `ghost.js` untouched — walls,
the house door, no-up tiles, per-level speed tables, tunnel slowdown,
frightened mode, being eaten and returning home as eyes.

> The one thing that does change hands is **when DESATADO is on**: then the
> driver gets two powers of their own (EMBESTIDA and ACECHO — see *Modo
> DESATADO*), because Pac-Man's Q would otherwise eat them in one tap with no
> answer. It is still the same ghost: the powers add speed and translucency
> and touch none of the rules above.

### Assignment

Each party member advertises a ghost id (`g`, 0..3, or -1 for Pac-Man) in
`phello`; the leader arbitrates in `Party.claim()` and republishes the result in
`proster`, so two players can never end up on the same ghost. `Party.anyPac()`
gates `canStart()`: a round with no Pac-Man is not a round.

`Party.gameOrder()` carries `g` per seat. `Game.newGame({ ghosts: [...] })`
passes it to `Versus.setup()`, which:

* normalises the list (`Versus.clean`): no duplicates, at least one Pac-Man;
* sets `ghost.human = true` on the claimed ghosts;
* marks the driver's `Pacman` as `out = true` with `lives = 0`.

Reusing `out` is what keeps the change small: an `out` pac is not drawn, not
targeted by `pacContextFor`, not collided against, does not consume lives and
does not count for `anyPlaying()` / GAME OVER. `Game.actorFor(i)` returns the
ghost instead of the pac for name tags and emotes, and `Game.colorFor(i)`
returns the ghost's colour.

### Movement rules

`Ghost.decide()` builds the legal-exit list exactly as before (walls, door,
no-up tiles, no reversal) and only then, for `Ghost.driven()` (`human &&
taken && mode === 'normal'`), hands over to `Ghost.humanChoice(candidates)`:

1. the requested direction, if legal from here;
2. otherwise straight on — what a player who is not pressing anything expects;
3. otherwise the first legal exit in the usual UP > LEFT > DOWN > RIGHT order,
   because a ghost never stops.

**When the exit is chosen.** The AI thinks one tile ahead (decision on tile
ENTRY, executed at the centre) and that arcade rule stays. For a driven ghost
it does not: entry-time planning eats the half tile before the junction, so a
key pressed *as you arrive* was never looked at, the ghost sailed past the
turn — and, because the intent is standing, it then turned two junctions later
on its own. `updatePath` therefore re-plans when `driven() && planWish !==
wishDir`, which gives the player the whole tile up to the centre, exactly the
window Pac-Man gets. The AI is untouched: its `wishDir` never changes. The
host re-plans through the same path when a `gdir` lands, so a late intent is
still applied at the junction the driver aimed at instead of the next one.

Consequences, all deliberate:

* **No 180° turns.** The requested direction is picked from a list that already
  excludes `OPP[dir]`, so the human is bound by the same rule as the AI. This is
  the rule that keeps Pac-Man escapable in a corridor, and it is what makes
  knowing the maze worth something. The one exception is the one the AI also
  has: a dead end, where `decide()` returns `backDir`.
* **No scatter/chase reversal.** `Game.forceReversal()` skips human ghosts:
  there is no mode to switch for them, and flipping them would take the
  controls out of the player's hands. The **energizer reversal still applies**
  (`forceReversalFright()` is untouched) — that is part of frightened mode,
  which the brief asks to keep as is, and it is the counterweight that makes
  eating an energizer worth something.
* **Frightened mode is still driven by the player.** The pseudo-random flee AI
  is AI; the player keeps the controls and runs away himself, at the slower
  `ghostFright` speed, and can be eaten.
* **House.** Modes `house`, `leaving`, `entering` and `eyes` are never
  player-driven: `decide()` only defers for `mode === 'normal'`. The one
  concession to playability: `Game.preferredInside()` prefers the human ghost
  and `Game.houseLimitFor()` returns 0 for it, so the player is not left
  bouncing inside the house for 60 pellets doing nothing.
* Cruise Elroy still applies if the human drives Blinky: it is a speed rule
  tied to the pellets left, not a targeting rule.

### Networking

Host authority is unchanged. The driver sends an **intent**, never a position:

sent immediately on change and re-sent every `CFG.VS.DIR_EVERY` ticks. It is a
standing intent rather than an event, so a lost message is repaired by the next
one. It replaces the driver's `pos` messages entirely (`Versus.sendDir()` short
-circuits `sendGuestUpdates()`) and doubles as his keep-alive: `netWatch` and
`posWatch` are fed by any message from that seat, and his pac is `out` so the
per-seat watchdog skips it anyway.

The host applies it in `hostGuestEvent` → `Versus.setWish()`. Snapshots gained
two fields: `s.vs` (the hunter's score) and `w` per ghost (its wish), so every
other client simulates the human ghost the same way between snapshots.

On the driver's own screen the ghost is simulated locally with authority, like
the guest's own Pac-Man: `applySnapshot()` does **not** copy its position unless
the mode changed (eaten, leaving the house) or the two have drifted more than
`CFG.VS.RESYNC_PX`. Copying every snapshot would be a visible tug on every
message, because the host is one network trip behind in applying the intent.

Divergence is bounded, not eliminated: if the intent lands after the host's
ghost has passed a junction centre, the two take different corridors and the
driver's screen has to accept the host's version. Measured with two simulated
browsers, 100 ms one-way lag and a player re-aiming six times a second, that
is about 4 corrections a minute, the largest around 10 px. The threshold is
deliberately *below* one tile: with a high threshold the drift compounds until
the two are in different corridors and the correction becomes a two or three
tile jump (14 px threshold: same number of corrections, but 19 px each).

`specView` carries `gh` (the ghost assignment) so spectators see who is who.

`CFG.NET.PROTO` goes 4 → 5: the roster, the snapshot and `gevt` all gained
fields, and an old client would silently play against an AI ghost.

### Scoring, records and player level

* Pac-Men keep the shared team score (`Game.score`).
* **Each hunter has his own**: `Game.vsScores` is one score per seat, read with
  `vsScoreOf(i)` and fed by `addVsScore(i, pts)`, `CFG.VS.CATCH_POINTS` (1000)
  per Pac-Man caught. The share-out allows **more than one** player-driven
  ghost (`Versus.clean` only insists that some Pac-Man is left), and a single
  shared counter could not say who did what — nor split the XP, since
  `myPoints()` feeds it. `Game.startDeath(who, byGhost)` takes the ghost that
  made the catch (the guest reports it in `gevt {t:'died', g}`) and forwards it
  to `Versus.onCatch()`, which pays **the owner of that ghost**.
  `Versus.hunters(game)` lists them with `{idx, name, ghost, score, catches}`
  and `topHunter()` picks the headline; catches are derived from the score
  (`score / CATCH_POINTS`) so they also add up on a guest's screen, which only
  receives the scores. The snapshot field `vs` is that array — hence
  `CFG.NET.PROTO` 6.
* `Versus.winner(game)` returns `'ghost'` when every Pac-Man seat is `out`
  (the hunter ran them out of lives) and `'pacs'` otherwise — surrender,
  disconnect or quitting all count as a Pac-Man win. The GAME OVER panel leads
  with it (`UI.versusLines()`).
> **When the score is uploaded (18 Sep).** `submitRanking` used to run only
> from `enterGameOverIdle`, so quitting to the menu kept the replay, the XP and
> the profile record but never created the ranking row — a real best game could
> vanish that way. `toMenu` now calls it too, except on GUARDAR Y SALIR (the run
> is still alive) and when the host just handed over the mando (the game goes on
> without us, so a partial score is not the team's mark).

* Versus rounds do **not** touch the world ranking (`submitRanking`), the local
  high scores (`persistHighScore`) or the mastery badges (`checkBadges`): the
  settings are not comparable.
* They **do** count for the player level, which measures how much you play.
  `Game.myPoints()` returns the seat's own points — `vsScoreOf(seat)` for a hunter,
  `score` for a Pac-Man — and `closeRun()` uses it for the XP, the end-of-run
  summary and the local history.

### On-screen identity

`Versus.drawMarks()` draws a small pulsing triangle above each player-driven
ghost (white for your own, pale pink for someone else's), skipped while the
ghost is hidden during an eat freeze. The name tag over the ghost during
"¡LISTO!" comes for free from `Game.actorFor()`. In the HUD,
`Game.hudNameFor()` appends the hunter's score to his name.

### Local two-keyboard versus

`setting.vsGhost2` (-1..3, chosen in OPTIONS · PARTIDA) is passed as
`ghosts: [-1, vsGhost2]` when starting a two-player local game. No extra
plumbing was needed: `Game.setPacDir()` is the single funnel for keyboard,
d-pad and swipe input, and `Versus.steer()` intercepts it there.

## Daily challenge, seasons and alternative mazes

**DAILY** (`PM.Daily`, `CFG.DAILY`, `js/daily.js`): seven challenges a
week, one per weekday, and **not a game mode** — that is the whole point. It
replaces RETO DE HOY, which *was* a mode: one identical seeded run for
everybody, one attempt a day, its own board. To play it you had to stop
playing what you were playing, and if that particular run did not appeal to
you that day, there was no challenge at all. A DAILY challenge is an objective
you meet **while playing whatever you were going to play anyway**.

- **Only today's counts.** All seven are visible from Monday — showing what is
  coming is half the reason to come back — but `Daily.abierto(i)` is
  `i === diaSemana()`: yesterday's has expired, tomorrow's is not there yet.
  A version with catch-up (everything opened stayed open until Sunday) shipped
  first and was pulled: if you can catch up on Saturday, it stops being a
  daily challenge and becomes a weekly shopping list, and "today" is precisely
  what brings somebody back tomorrow.
- **The date is the player's, not UTC.** The week id is the date of its Monday
  (`Daily.semanaId()`) and the weekday is Monday-first (`getDay` puts Sunday
  first, which would start the week at its end) — all in **local time**. The
  old RETO DE HOY used UTC because it had a worldwide board and everybody had
  to play the same day at the same instant. The DAILY sends nothing anywhere:
  it is yours and this browser's. In UTC a player in Peru (UTC-5) saw the
  challenge flip at 19:00 — Friday evening already showed Saturday's — which
  is simply wrong to anybody looking at a clock.
- **The seven come out of the week itself.** `Daily.retosDe(semana)` hashes
  the week id, shuffles the catalogue with it (Fisher-Yates over a small LCG)
  and takes **5 from `CFG.DAILY.LIBRES` and 2 from `CFG.DAILY.MODOS`**, then
  shuffles those seven into day order with a third hash so the mode-specific
  ones do not land on the same weekdays every week. Deterministic, so no
  server and no draw is needed: same week, same seven, everywhere.
- **Five free ones are the floor.** The mode-specific challenges are what make
  the DAILY show you the game (you look into DESATADO because it is today's),
  but a whole week of them — or worse, of challenges needing company — would
  be impossible for somebody who plays alone. `js/tests.js` enforces the floor
  across several weeks.
- **Measured with the achievements' own vocabulary, through the same funnel.**
  A challenge names a `stat` from `PM.Achievements.BASE` and a `goal`, and
  `Game.bumpAch()` calls `Daily.apunta(tags, o)` before claiming achievements.
  Nothing is counted twice and the engine gets no new hook. What differs is
  scope: these counters are **the day's**, not lifetime, so the accumulation
  type matters — `suma` stats add up across the day ("eat 20 ghosts"), `mayor`
  stats keep the best **single run** ("12 000 points"), and `menor` (times)
  keeps the lowest.
- `modo` on a challenge is one of the tags `Game.achTags()` produces — a mode
  (`clasico`, `lab`, `hab`, `vs`) or a format (`solo`, `party`) — and the
  challenge only advances when that tag is present.
- **Rewards: XP and a streak.** Each clear adds `CFG.DAILY.XP`, and
  `Daily.premiar` bumps the streak — days in a row clearing your challenge. It
  only moves once per local day (`est.ult`; there is one challenge a day now,
  but the guard is what makes it idempotent), and it **survives the week
  rolling over** — breaking someone's streak at midnight on Sunday because the
  calendar turned a page would be punishing the calendar, not the player.
- Local state is one localStorage row (`CFG.DAILY.KEY`): `{w: week, p: [7]
  progress, h: [7] cleared, racha, mejor, ult, sem, rv}`. Reading it when the
  week has changed resets `p`/`h` and keeps the streak. `sem` marks the week as
  already counted for SEMANA REDONDA, so re-entering after the seventh clear
  does not count it again.
- **`rv` is a wipe marker.** When it does not match `CFG.DAILY.RESET`, `leer()`
  returns a blank record — week, streak and best streak all gone — and the new
  marker rides along in `vacio()`, so the wipe applies exactly once and the
  DAILY carries on normally afterwards. It exists because the mode spent a
  while counting the wrong day (it ran in UTC: Friday evening in Peru already
  read SÁBADO), so there are streaks and weeks out there recorded against a
  different calendar. To wipe again, change the string. **The three DAILY
  achievements are untouched by it**: those counters live in the achievements
  store (`CFG.ACH_KEY`), and a progress reset must not take away something
  already earned.
- **What it looks like: LA CARTILLA** (15 Sep, `UI.buildDailyBox` /
  `UI.refreshDailyPanel`). The week is a card of seven squares, one ghost per
  day in `CFG.GHOSTS` order (BLINKY on Monday, PINKY on Tuesday...), drawn with
  `Sprites.drawGhost` like everything else. A cleared day is the ghost
  **caught**: frightened blue plus a CAZADO stamp; today's glows in its ghost's
  colour and bobs; days still to open are dark silhouettes, and missed ones
  grey. The front-page box shows the seven squares small, today's challenge,
  its bar, the `+POR_RETO` coins and a countdown to **local** midnight
  (`CIERRA hh:mm`, or `ABRE hh:mm` once cleared, when the text switches to
  tomorrow's challenge). Its 1 s timer only works while the box is on screen,
  and if the date changes under it the card refreshes itself. Inside, below
  the squares, the **week's loot**: seven `POR_RETO` slots and the
  `POR_SEMANA` chest, so the 290 coins at stake are visible before they are
  earned. Before this it was a grey line of text on the front page and seven
  identical rows in two columns inside — nothing showed what you earn or how
  long you have. The box may only grow ~25 px: at 1440×900 JUGAR already sits
  at the bottom edge. On narrow screens the seven cards scroll sideways and
  open centred on today.
- It is celebrated through the **achievement band** (`achNotices`, titled
  `RETO CUMPLIDO`) rather than a channel of its own: they are the same kind of
  thing to the player, and two bands fighting over the same slot is exactly
  what was removed from the mastery banner.
- **The three RETO achievements survive as DAILY ones**, ids and all
  (`rt_constante`, `rt_pulso`, `rt_redondo`), now reading `dailyOk`,
  `dailyRacha` and `dailySemana`. `Achievements.sembrarDaily()` seeds
  `dailyOk` from the retired `reto:partidas` counter — every day the old
  challenge was played was that day's challenge met — so nobody loses
  CONSTANTE overnight. It reads that key **raw** from storage, because
  `load()` only keeps stats some achievement still names and would drop it;
  `merge()` does the same for a history arriving from the cloud.

**What went with the mode**: `js/reto.js`, `supabase/reto.sql`, the RETO card
on the front page, the RETO DE HOY ranking tab (id `6`), `Game.reto` /
`Game.retoFecha`, and the `reto` achievement tag. `Game.seedBase` stays — the
engine still accepts a seed from outside, and old shared replays of challenge
runs carry one. The `reto_diario` table and its `reto_top` view were dropped
on 2026-08-15, once it was clear nothing read them any more.

**Temporadas** (`PM.Season`, `CFG.RANKING.VIEW_SEASON`): the world board
is split by **calendar month**, derived from `creado_en` — nothing to open
or close by hand. `supabase/temporadas.sql` adds
`ranking.temporada` as a **generated stored column**
(`to_char(creado_en at time zone 'UTC', 'YYYY-MM')`), so existing rows are
filled in automatically and **no row is written or deleted**; the old
`ranking_top` view is untouched and remains the HISTÓRICO. The new
`ranking_temporada` view is `ranking_top` grouped by month as well, with
the same columns so the panel renders both lists with one code path. The
month is computed in UTC on both ends — a client using its own timezone
would ask for a different season than the server around month boundaries.

**Laberintos** (`PM.Mazes`, `CFG.MAZE_CLASSIC`, `CFG.setMaze`): a separate
mode. The 1980 layout is what makes the memorised patterns work, so it is
kept verbatim in `CFG.MAZE_CLASSIC` and `CFG.setMaze(rows)` swaps
`CFG.MAZE` (and recounts `CFG.PELLET_TOTAL`, since each maze has its own
pellet count and level completion is driven by it). `Game.applyMaze(id)`
does the swap and rebuilds the two prebaked wall canvases, guarded by
`Game.mazeLoaded` so nothing repaints for nothing; `newGame` applies
`opts.maze` **before** `resetLevel()` (which deals the pellets) and
`toMenu` restores the classic **before** `loadPellets()`. A maze run sets
`Game.mazeId`, which blocks both `submitRanking()` and `canTimeRecord()`:
scores from another layout compare to nothing. XP still counts.

Each maze is authored as its **left half only** (14 columns) and mirrored,
which is where the arcade look comes from. Rows 9–19 are **copied from the
classic**, never retyped: they carry the ghost house, its door, the tunnel
row and the **upper** pair of no-up tiles (row 11), and the engine addresses
those tile by tile. The **lower** pair (row 23) falls outside that band, so
each maze must keep (12,23) and (15,23) a junction with a lateral way out —
`js/tests.js` checks it.
`js/tests.js` enforces the rest: **no 2×2 walkable square** (see below), every
pellet reachable from Pac-Man's spawn (BFS with tunnel wrap), the declared
pellet count, **no dead ends** (a ghost that enters one is stuck and the chase
is over), four energizers in the four corners, left-right symmetry, a closed
border except the tunnel, and the classic coming back when the mode is left.

**The rule that was missing: never two adjacent rows (or columns) of food.**
Formally, **no 2×2 block of walkable tiles** — the 1980 maze has exactly zero,
and the test asserts that against the classic too. It is not decoration: with
one-tile corridors, dodging means choosing a branch and the ghosts' patterns
mean something; in a two-wide space you just walk around them and the game
becomes something else. The first six alternative layouts were drawn without
it and had two-row bands, so all six were redrawn.

The rule forces the original's template: **corridor rows** (open end to end)
with **wall rows** between them, where a wall row may only have **isolated**
gaps — never two adjacent — or it forms a square with the corridor beside it.
Three traps that cost an afternoon each:

- **Column 1 stays open in almost every row** (the border lane). Without it
  the ends of each corridor row have a single exit and are dead ends.
- **At the mirror axis** (index 13 of the half) a gap open on two consecutive
  rows is also a square, because its reflection is the very next column.
- **Rows 8 and 20 are left as full corridors**: they are what connects each
  half to the core's single-tile openings, and anything narrower there strands
  whole regions or produces dead ends inside the copied rows.

**Six layouts, six ideas.** The first three were rectangle grids separated by
full-width bands — valid, but interchangeable: whichever you picked, you were
playing the same shape with the blocks moved. Each one now commits to a single
structural idea, and the descriptions in `Mazes.LIST` say which:

| id | idea |
|---|---|
| `anillos` | four concentric rings; the jumps between them are all on one row |
| `panal` | cells of two sizes, offset every two rows |
| `catedral` | tall vertical naves, two crossings, at different heights per side |
| `serpiente` | full-width corridors with the gaps at opposite ends |
| `colmillos` | six rows of one-tile fangs, bottom ones offset from the top |
| `escalera` | diagonal landings; **no row crosses the maze end to end** |

Two constraints do most of the work and are easy to trip over. Row 8 must be
open at columns 6 and 12, and row 20 at columns 6 and 9: the core's row 9 and
row 19 have single-tile openings there whose only other neighbour is inside the
core, so sealing them from above or below creates a dead end **in the copied
rows**, where it is hardest to see. And an inner region only escapes through a
tile that the neighbouring core row leaves open — which is why the top rings
work with the same drawing that leaves the bottom ones sealed.

Redrawing `anillos`, `panal` and `colmillos` **broke old net replays of those
mazes**: the id still resolves but the layout underneath changed, so playback
would show Pac-Man walking through walls. `Mazes.conocido(id)` exists for that
— `Replay.leerRed` rejects a replay whose maze it does not know, which reports
it as corrupt instead of playing nonsense. Local (URL-shareable) replays never
carried a maze, so only the two stored net replays are affected.

## Modo DESATADO (Q/W/E/R)

**`PM.Hab` (`js/habilidades.js`), `CFG.HAB`.** The 1980 maze with four
MOBA-style powers, each on its own key and its own cooldown. Named
HABILIDADES until 2026-08-14 — the old name said what the mode *has* instead
of what it feels like; **every internal id stays `hab`** (settings, replays,
the wire, achievement counters, badge tracks), so only the visible strings
moved. Like LABERINTOS it is a **separate world**: `Game.hab` blocks
`submitRanking()` and `canTimeRecord()`, and sends the score to its own
record instead of the classic one. That last one matters more than it looks —
the record is not just a number on screen: it travels to the account and the
maestrías are derived from it, so a score made by biting ghosts would hand out
a badge for a game the badge does not describe. XP and achievements still
count.

| Key | What it does | Cooldown |
|---|---|---|
| **Q** MORDISCO | Eats any ghost within `BITE_PX` **pixels** (Chebyshev, tunnel-aware), whatever direction Pac-Man faces, and turns him toward the bite. Teeth for `BITE_SHOW`. Pressed with nobody in range it stays **armed** for `BITE_BUFFER` ticks and bites by itself the moment one arrives. | 16 s |
| **W** TURBO | ×1.5 speed for 5 s, trailing sparks. | 24 s |
| **E** FLASH | Jumps **3 tiles through walls toward the last arrow pressed** — not toward where Pac-Man faces — eating dots and energizers on the way, translucent on landing. | 32 s |
| **R** GRITO | Frightens all four ghosts for a **fixed 6 s** with no energizer. | 60 s |

Cooldowns live **only** in `CFG.HAB.LIST[k].cd` (`CFG.HAB.segs(k)` for UI
text). They are long on purpose: with four powers and short cooldowns the
maze stops mattering, because something is always available.

Rules that are deliberate, not incidental:

- **Movement is arrows only — when one person plays.** `W` is the turbo, so
  WASD is disabled wholesale in solo and online: leaving A/S/D moving while W
  does something else is the worst of both worlds. **With two on one keyboard
  the opposite holds** and WASD moves again, because the powers move out of
  the way: each player gets one row in their own half of the keyboard
  (`CFG.HAB.KEYS_2P`), **J1 on arrows + `N M , .`** and **J2 on WASD +
  `Z X C V`**. Keys are matched by `ev.key`, not physical position: those
  eight exist identically on ANSI and on a Spanish ISO layout. The HUD bar
  grows a group per player (`.hab-grupo`), each labelled and each showing its
  owner's cooldowns; `UI.habIdxDe(gi)` maps group → player, which is `gi` in
  local two-player and `Game.localIdx` everywhere else.
- **The bar shows seconds, not just the bar.** Each button carries a
  `.hab-secs` counter fed by `Hab.restan(idx, k)` (`ceil(cd/60)`, 0 when
  ready — rounding **up** so the counter never reads 0 on a dead key). It
  takes the slot of the power's name via `.contando`: recharging you want the
  number, ready you want to know which power it is, so the two never compete
  for the same 46 px. The fill bar stays — it answers "roughly how long" at a
  glance, the number answers "exactly how long", which is what decides whether
  you wait or spend a different key.
- **Teammates' cooldowns are on screen too** (`.hab-otro` rows, up to three —
  a four-player party). Each row is a name in that player's colour plus four
  flat cells showing the key when ready and the seconds when not. They are not
  buttons: another player's powers are not yours to press. A "teammate" is
  anyone this machine does not drive: none in local two-player (both already
  own a full group), everyone but `localIdx` online. On touch the floating
  bar stacks the rows **above** your own buttons (`order: -1`), away from the
  thumbs.
- **Cooldowns ride the snapshot, not just the use event.** A use is announced
  once and nothing confirms it — the transport is Supabase Realtime
  **broadcast, no ack** — so a dropped `hab` event would leave that HUD cell
  lying for the rest of the run, since nothing ever looked at it again. That
  is a real failure that showed up in play. Re-sending the event does not fix
  it (the retry can drop too), so `buildSnapshot` carries `hb` —
  `Hab.resumen()`, four ints per player — and `applySnapshot` feeds it to
  `Hab.aplicarResumen(hb, mine)` at 12 Hz: a dropped announcement is repaired
  within ~0.2 s. The event is still needed (it is what makes the sound and
  the teeth land on the frame you pressed), it just no longer carries the
  number alone. **Your own cooldown is only corrected upwards**: the host
  learns what you pressed a network trip later, so its snapshot still has
  your key charged, and applying it blindly would re-light your cell for a
  blink right after you pressed it. Upwards the host is the authority. The
  field is additive, so an old client just ignores it — no `PROTO` bump.
- **Which powers you get depends on what you are driving.** `Hab.listaDe(G, i)`
  returns `CFG.HAB.LIST` for a Pac-Man and `CFG.HAB.LIST_G` for whoever is
  driving a ghost in PAC-MAN VS. It is resolved **lazily on every call**, never
  cached at `empezar()`: `Versus.setup()` runs *after* `Hab.empezar()` in
  `Game.newGame`, so when the cooldowns are built nobody knows yet who drives
  what. `Hab.cuantas(G, i)` is the cap `puede()` checks, which is what stops a
  guest asking for FLASH while carrying a ghost.
- **Q's range is measured in pixels, not tiles**, and this matters more than
  it sounds. With tile counting the bite failed constantly for no visible
  reason: two sprites can be **nine pixels apart** — visually overlapping —
  and still sit in non-adjacent tiles, each at the far edge of its own. Range
  then depended on where in the stride the press landed, which is exactly
  what makes a button feel broken. `BITE_PX` is a tile plus `BITE_MARGIN`,
  so "what looks touching, bites", identically in all four directions.
  `BITE_MARGIN` went from 4 to **8** (half a tile more, so the reach is two
  clean tiles) because party play still missed too much: the ghost you see
  glued to you is not exactly there on the host's screen.
- **Teeth show under every skin**, because they are the "the key landed"
  signal — without them a missed shot and a key on cooldown feel identical.
  What changes is *how* `Sprites.drawPacTeeth(…, skin)` draws them, since two
  skins do not paint a solid Pac-Man:
  - **pixel** — one 1.5 px block per tooth, on the same screen grid as the
    body (rotated by hand, then rounded: the normal path rotates the whole
    canvas and a `fillRect` under rotation no longer lands on the body's
    grid). Smooth triangles over a blocky body read as a bug.
  - **aro** — the lip is not a body edge but a 2.5 px yellow stroke, so teeth
    resting on it read as a highlight rather than teeth (measured: 22 white
    pixels, all of them on yellow). They move ~7° into the mouth, where the
    black is. Drawing them *stroked* was tried first and is worse: a tooth is
    2 px wide, so at game scale the stroke fills it and yields a shapeless
    white blob.
- **Q and E refuse to be wasted.** No ghost in range, or no landable tile
  ahead, and nothing fires and no cooldown starts. A bite at thin air still
  **shows the teeth** briefly: without that, missing and being on cooldown
  feel identical (nothing happens) and the key reads as broken.
- **A Q pressed a hair too early stays armed** for `BITE_BUFFER` (18 ticks,
  0.3 s) and fires the instant a ghost enters range. Head-on, the honest
  window to bite is **five or six ticks**: Pac-Man moves ~1 px per tick and a
  ghost ~0.95, so meeting face to face they close nearly 2 px per tick, and
  from "ghost enters the 16 px reach" to "ghost shares the tile and kills
  you" is under 100 ms — a third of human reaction time. Players pressed when
  they *decided* (ghost three or four tiles away), the bite went to thin air,
  and the ghost killed them half a second later: from the outside, "I used Q
  and it killed me anyway". The buffer is the same idea as `nextDir` for
  turns — a requested action waiting for the world to allow it. It is
  resolved in `Hab.paso()`, which runs at the top of the tick *before*
  anything moves, so the bite always lands a tick before a ghost can step
  onto Pac-Man's tile. It grants **no extra reach**: two tiles still bite,
  three still do not, and missing still costs no cooldown.
  - The **thin-air sound fires immediately**, not when the buffer expires:
    the swipe happens on that tick and the teeth come out with it, and past
    ~100 ms a sound stops feeling attached to the key. If the armed Q later
    connects, that is a genuine **second** bite and sounds like one — the
    dull `playBiteMiss` and then `playBite`. Expiry is silent and invisible:
    the margin is borrowed aim, not a power of its own.
- **E aims where the player last pointed, not where Pac-Man faces.** The
  engine already keeps that: `Pacman.nextDir` is "the last requested
  direction" and survives a wall refusing the turn, so `Hab.dirFlash()`
  just reads it. No extra state, nothing new on the wire, nothing new in
  replays — and it is identical on every screen because `nextDir` is part
  of the simulation. As a bonus, after landing Pac-Man carries on in that
  direction by himself if the corridor allows it. The trail is drawn from
  `flashDir` (stored per player), since the jump need not match the gaze.
- **E never lands in the ghost house.** `CFG.isOpen` treats the house
  interior as walkable (it is, for ghosts), so `habilidades.js` guards
  `CFG.HOUSE` explicitly: Pac-Man has no door and would be stuck forever.
- **Outside fright, every bite is worth the same** (`GHOST_CHAIN[0]`).
  The 200-400-800-1600 ladder belongs to the energizer; chaining it from a
  keypress would turn the run into free points. With ghosts already blue
  the bite joins whatever chain is running.
- **The shout is 6 s at every level.** `triggerFright(segsFijos)` bypasses
  `CFG.fright(level)`, which by level 18 is zero: the ultimate would
  switch itself off exactly when it is needed.
- Cooldowns tick only while `state === 'PLAYING'`, unpaused and outside
  the eat-freeze. Dying or changing level clears **effects** but not
  cooldowns (`Hab.limpiarEfectos()` from `respawn` and `resetLevel`).

**Online authority** mirrors what the netcode already does. Powers that
only touch your own Pac-Man (TURBO, FLASH) apply locally the instant you
press — you already simulate your own Pac-Man and its position travels in
`pos`. Powers that touch the ghosts (MORDISCO, GRITO) are **executed by
the host**, exactly like eating a blue ghost: the guest sends
`gevt {t:'hab', k}`, the host validates against **its** copy of the
cooldown (the guest's lives in their browser and is not trustworthy) and
runs `eatGhost` / `triggerFright`. The host then broadcasts
`evt {t:'hab', w, k}`, which is **visual only** for everyone else — the
state change already arrives in its own `eatGhost` / `fright` event, and
applying it twice would double-count it. The sender ignores its own echo.
A rejected request loses the keypress and the local cooldown has already
started: it can only ever give less, never more. The mode itself travels
in `pstart.hab` (and in `proster.hab`, so nobody discovers the rules when
the game starts) and in `svista.hab` for spectators. `CFG.NET.PROTO` is
**7**.

Two corrections that make the bite usable in a party — both are lag
compensation, and both only ever give the guest what they already saw:

- **The biter does not die with the ghost it bit.** The guest does not kill,
  so between the keypress and the host's confirmation the ghost is still alive
  and glued to them — and the bite has just turned Pac-Man to face it
  (`mirarHacia`). They walked into it and `guestCollisions` killed them for
  landing the shot. `Hab.mordisco` now sets a per-ghost shield
  (`estado.guard[ghostId] = CFG.HAB.BITE_GUARD`, 45 ticks) and
  `Game.guestCollisions` **skips that ghost entirely** while it holds — not
  just the death branch: eating it locally would send an `ateGhost` on top of
  the bite and the host would count it twice. The shield expires on its own,
  so a request the host rejects just leaves the ghost dangerous again.
- **The host forgives the wire's drift.** `Hab.peticion` validates the bite
  with `CFG.HAB.BITE_NET_MARGIN` (one tile) added to the reach: the guest's
  position arrives at 12 Hz and the host moves the ghosts itself, so by the
  time the request executes neither is where the guest saw them. That is ~6 px
  nobody caused, and it was eating half the bites. It does **not** widen the
  reach — the guest only fires when their own screen agreed at `BITE_PX`.

### PAC-MAN VS. with powers (`CFG.HAB.LIST_G`)

The mode used to be barred from VS. for a real reason: one-tap eating a ghost a
person is driving, with no counterplay, is not a fight — it is a punching bag
with keys. It is allowed now because **the ghost driver has their own two**:

| Slot | Power | Effect | Cooldown |
|---|---|---|---|
| 0 | **EMBESTIDA** | ×`CHARGE_MULT` (1.35) speed for `CHARGE_TICKS` (4 s). | 20 s |
| 1 | **ACECHO** | `STALK_TICKS` (4 s) translucent **and with the player marker removed**. | 30 s |

Two and not four on purpose: a ghost does not eat, does not phase through
walls and frightens nobody — it only chases. All it needs for a fight is to be
able to close a gap and to be able to disappear for a moment. Cooldowns are
longer than Pac-Man's because the ghost does not die: a wasted power costs it
time, not the run.

- **EMBESTIDA is applied in `Ghost.speedPx`, after the clamp**, exactly like
  TURBO in `pacSpeedPx` and for the same reason: the clamp exists so classic
  runs stay comparable, and a VS. run with powers competes with nobody. The
  hook is `Hab.multVelFantasma(game, ghostId)`, which returns 1 outside the
  mode, so every other game is bit-identical.
- **ACECHO is half visual and half mechanical, and the mechanical half is the
  marker.** `Versus.drawMarks` skips a ghost while `Hab.marcaVisible()` is
  false; going translucent with a white triangle floating over you hides
  nothing. `Hab.alfaFantasma()` shows the **driver** their own ghost at 0.55
  and everyone else at `STALK_ALPHA` (0.3): hiding from yourself is not an
  ability, it is a nuisance. In local two-player there is no "own player", so
  the marker stays — the case that matters is online, and it is tested there.
- **Both are self-only**, so they follow the TURBO/FLASH path online: applied
  locally on press, and the host merely *records* them. Recording them on the
  host is not optional — the host simulates that ghost, so without the same
  speed the guest would outrun their own ghost and the resync would jerk for
  the whole charge. The echo (`evt {t:'hab', w, k}`) applies them too, for the
  same reason: every screen dead-reckons that ghost between snapshots.
- `Hab.puede()` asks a ghost driver for a **ghost in the maze** rather than a
  live Pac-Man (they have none): inside the house, leaving, or returning as
  eyes there is nothing to charge at and nobody to hide from.

**Replays.** A power is an *input*, like a turn, so a run of this mode
reconstructs exactly like a classic one. Local replays get mode `'hab'`
(letter `h`) for one player, `'habduo'` (`j`) for two on one keyboard and
`'habvs'` (`k`) when one of them drives a ghost, with entries
`[tick, player, 4+k]`. Powers encode into the letters at both ends of the
alphabet, since `G..V` still carries the sixteen player×direction turns:
**`A..D` for player 1** and **`W..Z` for player 2**. Eight combinations is all
this format ever needs — from three players up the game is online and records
the other way. The entry is written **after** the power actually fires, so a
bite at thin air does not bloat the file. Old clients reject an `h`/`j`/`k`
replay cleanly as corrupt, which is correct. Net replays carry `hb` in the
header.

### PAC-MAN VS. replays (`'vs'` / `'habvs'`)

For a while these were **not recorded at all**, because they came out lying:
the ghost driver's steering went through `Versus.steer`, which intercepted
*before* `Replay.entrada` in `Game.setPacDir`, so the file held half the
orders and the human ghost wandered off on its own during playback.

`Game.setPacDir` now records **first** and dispatches after, for ghost drivers
and Pac-Men alike — one funnel, one entry format, `[tick, player, dir]` either
way. `Replay.rumboDe(idx)` supplies the "already requested" value the dedup
compares against: `ghosts[gid].wishDir` for a driver, `pacs[idx].nextDir`
otherwise (without it, a driver's held key would write an entry per frame).

The assignment itself travels in **`ajustes.ghosts`**, serialized as one
character per player after the fixed four: `g-1` is "P1 on Pac-Man, P2 on
Blinky". It lives with the settings because that is what it is — the thing
that changes the simulation, exactly like `vidasModo`. Trailing `ajustes`
entries are read **by what they are, not by position**, so adding another flag
later cannot shift this one. `valida()` requires it in VS modes (with at least
one Pac-Man and at least one human ghost) and forbids it everywhere else.

The proof that any of this works is not the score matching — it is the human
ghost's **final position** matching, which is what the test asserts.

### Roles (`CFG.HAB.ROLES`)

Each player picks a **role** before playing; the four keys stay Q W E R (or the
`KEYS_2P` rows) and `js/habilidades.js` dispatches by the power **id**, not by
the key index. `LIST` is the ASESINO (the original kit).

| Role | Q | W | E | R |
|---|---|---|---|---|
| **ASESINO** | MORDISCO 16 s | TURBO 24 s | FLASH 32 s | GRITO 60 s |
| **TANQUE** (`LIST_T`) | PROVOCAR 32 s (5 s active) | ESCUDO 24 s | PISOTÓN 32 s | ARROLLAR 60 s |
| **SOPORTE** (`LIST_S`) | HIELO 16 s | INMUNIDAD 24 s | ESCUDO ALIADO 32 s | VIDA 180 s |
| **MAGO** (`LIST_M`) | FUEGO 20 s | PORTAL 24 s | RUNA 32 s | TORMENTA 60 s |

- **Rules** (`Game.rolesDe`, same on every machine): unknown role = asesino;
  PAC-MAN VS. = everyone asesino; **no role is ever repeated** (18 Sep): a
  player asking for a taken role keeps the one they already held, or else gets
  the first free id in `ROL_IDS`. Enforced in three places — `Game.rolesDe`
  (the last filter, so nothing repeated enters even from the wire),
  `Party.claimRol`/`Party.gameOrder` in the lobby, and both role pickers,
  which grey out whatever another player holds (`Party.rolDeOtro`).
  `Game.practica` = DESATADO + one player + role ≠ asesino: no record, no
  ranking, no badges (`persistHighScore`, `checkBadges`, `submitRanking`);
  XP and achievements still count. HUD and GAME OVER say PRÁCTICA.
- **PASIVAS (20 Sep).** One per role, always on, so a team *needs* each of
  them instead of picking by taste. **ASESINO: every kill is worth 25 % more**
  (`HAB.BONO_ASESINO` = 1.25) — the energizer chain pays 250 / 500 / 1 000 /
  2 000 (a quadruple goes from 3 000 to 3 750), ability kills pay 250 instead
  of `MAGO_PUNTOS`, and finishing the REY FANTASMA pays 1.25 × `JEFE.PREMIO`.
  It shipped at 1.5 and was cut the same day: at half again the asesino was
  not needed, it was compulsory — any other role cost a third of the
  scoreboard, which is a fixed slot in the line-up, not balance.
  It runs through one place, `Hab.puntosDe(G, who, base)`, called from
  `Game.eatGhost`, `Hab.matarMago` and `Jefe.morir`: the bonus belongs to the
  **role**, not to one way of playing, which is also why it is not limited to
  the bite. Guests get the amount inside the event (`magoKill.p`), since they
  cannot know whose kill it was. Outside DESATADO it does not exist.
  **SOPORTE** keeps the one it has had since 17 Sep: it lifts a downed
  teammate in a single pass where everyone else needs five
  (`CFG.REVIVIR.PASADAS`). **TANQUE: CORAZA** — a one-hit shield that is
  simply always on; it does not expire (waiting around for a timer is the
  opposite of what a tank does) and comes back `CORAZA_CD` (25 s) after it is
  broken, dead or alive, so respawning never costs it. It **stacks with its
  own W**: shields are now spent **one per hit**, in order — the SOPORTE's
  (which expires), then the W's, then the CORAZA — where before a single hit
  took every shield you had, which made wearing two pointless. Drawn as a
  fixed inner ring; it travels in the roles snapshot as two extra fields
  (`corPas`, `corCd`), and an older snapshot simply does not carry them.
  **MAGO: EL OJO** — **where each ghost is about to go**: the next
  `OJO_PASOS` (5) tiles of its path, dotted on the floor in that ghost's
  colour, plus the ghost mode and its countdown above the maze
  (`Hab.dibujarOjo` + `avisoDeModo`). It first shipped marking only the target
  tile and that was useless — a distant dot does not tell you which way it is
  coming from, which is the only thing you decide when it is on top of you.
  `Ghost.rutaPrevista` walks the same rules the ghost really uses (legal
  exits, no reversing, no-UP zones, nearest tile to its target) as a read-only
  look-ahead: it touches nothing, which is also why **blue ghosts get no
  path** — those pick at random off the run's counter, and guessing it would
  mean spending it. Eyes, ghosts in the house and human-driven ones are out
  too. The prediction can be wrong, and should be: the target is recomputed
  with Pac-Man where he is *now*. Only the mage sees any of it, and it is
  drawing only — it never touches the game or the network. The role picker
  shows the line `PASIVA · …` under the motto (`ROL_INFO[].pasiva`), which is
  always there even when empty so the screen does not jump between roles.
- **TANQUE.** PROVOCAR: `Hab.objetivo` returns the nearest provoking tank's
  tile for **every ghost out in the maze**, and since 20 Sep that includes
  **blue ones**: the shout is how the tank saves the team, and while the
  frightened ghosts kept doing their own thing, anyone stepping on an
  energizer cancelled the play exactly when it mattered most. It now decides
  ahead of the blue random walk *and* ahead of PISOTÓN in `Ghost.decide`, so
  no other ability can deflect it. The one thing it does not override is a
  ghost a **person** is driving (`driven()`): nobody gets the controls taken
  out of their hands. Eyes and ghosts in the house stay out — they are not
  chasing anyone. The price, deliberately: with an energizer running the blue
  ghosts walk into the tank and get eaten, so the shout doubles as a feeding
  tool. Provoked ghosts also **ignore the rest of the team**: they cannot kill
  anyone but the tank (`Hab.ignoraA`, checked in both collision loops and,
  since 18 Sep, in `Jefe.mata` too). Every chaser facing away is
  **reversed on the spot** (`Hab.deEspaldas` + `forceReverse`; the tunnel
  shortcut only counts when both are on `TUNNEL_ROW`) — without it the shout
  took seconds to matter in a long corridor. The REY FANTASMA answers too
  (`Jefe.acude`), except mid-charge or mid-summon. ESCUDO (`coraza`): lasts 8 s or until the first lethal hit breaks it,
  then `ESCUDO_GRACIA` ticks of grace (`Hab.salvaDelChoque`). The SOPORTE's
  ESCUDO ALIADO (`escudo`) works the same; they are drawn orange and cyan. PISOTÓN: **every ghost out in the maze** flees for 6 s — no range at all
  since 20 Sep (`Hab.huyeDe` → `Ghost.decide` picks the exit farthest from
  the tank; a ghost heading at the tank is reversed); not blue, not edible; an
  empty street (all eyes or in the house) = not cast. A radius made the hit
  feel half-done — the ones across the map kept coming while the tank put
  itself on the line — and it forced a network fudge factor, because a ghost
  the guest sees right on the edge is not there on the host's screen. With no
  edge there is nothing to argue about, so `BITE_NET_MARGIN` no longer applies
  to it. `PISOTON_ONDA` (15) is now only how far the drawn shockwave grows. Since 18 Sep the REY FANTASMA also flees (`Jefe.espanta`: `jefe.huye`
  ticks, `huyeDe`, target mirrored through its own tile, speed ×
  `PISOTON_LENTO`; both travel in the snapshot as fields 11-12).
  ARROLLAR (the APISONADORA): straight toward the last arrow at
  ×`APISONADORA_MULT` (1.4) **until it hits a wall** (no timer; capped at one
  full lap for tunnel safety), not steerable;
  invulnerable, and every ghost it touches dies for 200 flat, no chain, no
  freeze (`matarMago` with `'aplasta'`; `moverArrolla` replaces `p.update`).
  Against the boss it deals `DANO.aplasta` **and stuns it**
  `JEFE.ATURDE_APISONADORA` (3 s), on both the host path and the guest's
  `jefeGolpe` request.
- **SOPORTE.** HIELO: projectile (`PROYECTIL_VEL` px/tick, stops at walls,
  wraps in the tunnel) freezing the first ghost and every ghost on its tile for
  3 s: speed 0, not lethal, still biteable. Always spends. INMUNIDAD: 3 s
  untouchable. ESCUDO ALIADO: shield (`ALIADO_TICKS`, 8 s or one hit) to the
  nearest living teammate; none = not cast (deliberately useless solo).
  **Hold** (`CFG.HAB.MANTENER`, ticks): Q and E are held abilities. On those
  keys the short version fires on **release** (`Hab.apretar` / `Hab.soltar`,
  from keydown/keyup and the touch buttons' pointerdown/pointerup; key
  auto-repeat is ignored, window blur cancels without firing). `Hab.cargas`
  counts held ticks only while PLAYING and unpaused, and is called from
  `Game.step` **before** `Replay.paso`, so the long version is recorded with
  the same tick at which playback re-injects it. Q held 120 ticks: an ice plate
  (`placas[idx]`, one per player, `PLACA_TICKS` = 8 s) on the support's tile;
  every ghost stepping on it freezes `HIELO_TICKS`, once per ghost per plate
  (bitmask `z`). E held 180 ticks: shield (`ALIADO_TICKS`) to the **whole
  team, the support included, at any distance** (20 Sep; it used to reach two
  tiles and skip himself — the one who hands out shields stayed bare, and the
  range asked the team to bunch up exactly when spreading out is what saves
  them). Only a dead player is skipped, so it always casts while he is alive.
  `ALIADO_AREA_TILES` survives as the radius of the ring drawn when it goes
  off, and because old replays may carry it. Both share the short version's cooldown. Replay entries:
  qué 9..12 = held power 0..3, encoded `F` + digit (player*4 + power). VIDA: +1 to the living teammate with fewest lives (tie → nearest; shared
  lives → the pool), capped at `VIDA_MAX` (5); never revives `out` players.
- **MAGO.** Every kill is `Hab.matarMago`: `MAGO_PUNTOS` (200) flat, **no
  chain change and no eat freeze**, event `magoKill`. FUEGO: same projectile
  as HIELO, kills the first ghost. PORTAL: first press places the entrance
  without spending and puts the mage in the **other dimension**
  (`st.dimension`, up to `PORTAL_ESPERA` = 8 s): `salvaDelChoque` always saves
  him and both collision loops skip him, `eatAt`/`guestEatAt`/fruit ignore him,
  `pacContextFor` skips him (nobody left → the ghost's scatter corner), `puede`
  only allows the portal key, and `Game.render` draws ghosts and other players
  grayscale at 0.3 alpha for the viewer inside (`miraDesdeDimension`; never on a
  shared two-player screen) while others see him at 0.35. Second press
  (`cerrarPortal`) places the exit, opens both mouths `PORTAL_TICKS` (20 s) and
  spends (cd 46 s). If not pressed, the machine that simulates that Pac-Man
  closes it at 8 s where he stands (a guest then sends the same `hab` request;
  the host closes a silent guest's after `PORTAL_RED_GRACIA`). Open portals
  survive `limpiarEfectos` (death and level change); a pending one is closed
  first by `Hab.antesDeRecolocar` from `resetLevel`/`respawn`. Any Pac-Man
  crosses on **entering** a mouth tile (`Hab.cruzar`) **while holding SPACE**
  (18 Sep: `Hab.espacio[idx]`, set by the keydown/keyup pair in `js/ui.js`,
  cleared on blur; local-only, since each machine crosses its own pacs). The
  tile is recorded even when not crossing, so releasing and pressing again
  without moving does nothing. Then `PORTAL_CRUCE` ticks without crossing. RUNA: trap on the mage's tile for 15 s; when stepped
  on, kills **every** ghost on that tile. TORMENTA: **three** bolts (`TORMENTA_RAYOS` = 3) on the nearest ghost
  within **10 tiles** (20 Sep; it was two within six). The first falls **the
  instant it is cast** — what you press has to show — and the other two one per
  second. A bolt with no target is lost; cut if the mage dies.
- **SUPERVIVENCIA (`js/supervivencia.js`, `CFG.SUPERV`).** Party only (2–4,
  `opts.superv`; excludes hab/caza/VS, forces `livesMode: 'individual'` with one
  life each). State in `Game.superv`. Energizer eaten → `poder[i] = PODER` and
  the tile is queued in `vuelven` to reappear after `VUELVE`; a powered pac
  touching an unpowered one (`CHOQUE` px) kills it and scores a `bajas` point.
  The zone closes a ring every `ZONA_CADA` after `ZONA_INICIO` up to
  `ZONA_MAX`; `anilloDe` is the tile's distance to the border, pellets inside
  are removed, and standing inside for `ZONA_GRACIA` kills — each machine
  decides that for its own pacs. Pellets reload instead of finishing the level.
  `mirarFinal` ends the game when one pac is left (`ganador`, `caidos` for the
  standings); host sends `svZona`, `svBaja`, `svFin` and the `sv` snapshot
  block. Excluded from records, ranking, CONTINUE and revive; the game over is
  `UI.showSupervFin` (standings table).
- **REY FANTASMA (`js/jefe.js`, `CFG.JEFE`).** Every `CADA` (5) levels of DESATADO
  (not VS., not CACERÍA). `Jefe.alNivel` runs at the end of `resetLevel` and
  keeps all its state in `Game.jefe` (plain data, so rewind photos and saved
  games carry it). The four ghosts start in the house and `retieneCasa` blocks
  every normal release (dot counters, failsafe); only INVOCAR releases one.
  Level ends when `jefe.vivo` is false, not on `dotsLeft`. States: caza (tile
  pathing toward nearest living pac, provocation first, fleeing while fright),
  aviso (`AVISO` ticks) → carga (straight at `VEL_CARGA` until a wall), invoca.
  Damage (`DANO`, then `INV` ticks immune): fright contact once per player per
  fright, mordisco when no ghost is in reach, fuego bullet, rayo if nearer than
  any ghost, runa on its tile, apisonadora contact; hielo/placa freeze `HIELO`.
  Mordisco also stuns it `ATURDE_MORDISCO` (2 s) through the same `frz`, since
  biting means touching it and the trade used to cost a life every time.
  Contact otherwise kills (through `salvaDelChoque`). Host/local simulates
  (`paso`, `colisiones`); snapshot `jf`; guests move it by estimate, decide
  their own deaths and send `jefeGolpe` for contact hits; events `jefeDano` /
  `jefeKill`. Network replays do not carry it yet.
- **Network (PROTO 12; 12 adds `dimension` as the 9th field of each player's role row; 11 adds the held flag `m` on the guest's `hab` request and `pl` plates in the role snapshot).** Anything touching ghosts or lives is executed by the
  host (`Hab.peticion(G, who, k, d)`, where the guest sends its arrow `d`,
  tile `c,r` and position `x,y`); self-only effects (ESCUDO, INMUNIDAD, the
  ARROLLAR run, portal crossing) run on the machine that simulates that Pac-Man,
  since that machine decides its deaths — both collision loops consult
  `congelado` and `salvaDelChoque`. A guest's ARROLLAR asks the host to eat
  with `habCome` (validated by `arrollaRed` and distance). Snapshot field `hx`
  (`Hab.resumenRoles`) carries per-player effects, frozen/fleeing ghosts,
  projectiles, portals and runes. Party members carry `r` (role); `pstart`
  order carries it too.
- **Replays.** Local replays store `ajustes.roles` (flag `r` + one letter per
  player) only when someone is not asesino; online replays store `rl`.
  `Hab.foto/ponerFoto` include roles and the whole table (`mesa`).
- **Server.** `enviar-record` adds, per player, the max over roles of what
  DESATADO can yield by time (asesino points, mago ghosts) and the client sends
  `roles` for auditing.

## Modo CACERÍA (everyone is a ghost, the machine is Pac-Man)

**`PM.Caza` (`js/caceria.js`), `CFG.CAZA`.** PAC-MAN VS. turned around: one
to four players each drive a ghost and Pac-Man is driven by the machine. It
reuses VS. entirely (human ghosts, `vsGhosts`, hunter scores, `winner()`,
marks, the `gdir` intent on the wire) and adds three things.

**The bot is a seat.** `Game.newGame({caza: true})` appends one extra
`Pacman` to `pacs` (index `playerCount`, `bot = true`) and hands
`Versus.setup()` the fixed assignment `Caza.reparto(n)` = seat *i* drives
ghost *i* (Blinky first, because he starts outside). Being a seat is what
keeps game.js untouched: the bot eats, dies, respawns, spends the shared life
pool, is chased by `pacContextFor`, travels in `ps`/`out`/`pd` of the snapshot
and pays `Versus.onCatch()` like any Pac-Man. What differs is spelled out per
call site: `isLocalAuth()` gives it to whoever simulates (host/local),
`rawName/colorFor/skinFor` return `PAC-MAN`, yellow, classic; the achievement
bumps for ghosts eaten, fruit, `limpios` and `nivelMax` skip it (`achTags()`
tags the game `caza`, with its own three achievements); `netMaintain`'s
per-seat watchdog and `specView` ignore it (the spectator gets `n =
playerCount` plus `caza: true` and builds its own bot). `livesMode` is forced
to `'shared'`, the bot runs at `CFG.CAZA.VEL_PAC` (×1.1) on top of the table
and the host's multiplier, and DESATADO excludes the mode (`caza` is dropped
when `hab` is on).

**The power.** `loadPellets()` serves the four `o` as `.` (still 244).
`Game.cazaTicks` counts down while PLAYING and no fright is active
(`Caza.reloj`): at zero the host calls `triggerFright(Caza.duracionSegs())`
and reloads the counter. Period and duration are **per round** (`level −
startLevel`): 20/18/16 s between powers, 6/7/8 s of power, `frightMult`
applied with a 2 s floor. The last `AVISO` = 3 s ring the bot with a pulsing
halo and beep once per second (`AudioSys.playPowerWarn`); the HUD's HIGH
SCORE slot shows `PODER EN Ns` / `¡PODER! Ns` (`Caza.hud`). The counter
travels in the snapshot as `cz` and the guest runs it locally between
snapshots for a smooth countdown; it never triggers the fright itself.
`triggerFright` with fixed seconds now falls back to 5 flashes when the
level's table has none (also fixes GRITO past level 17).

**Rounds.** `CFG.CAZA.NIVELES` = 3. Clearing the last one goes straight from
LEVEL_DONE to GAME_OVER (`Caza.partidaGanada`) with `winner() === 'pacs'`;
losing every life ends it the usual way with `'ghost'` and the top hunter in
the headline. `UI.versusLines()` says how many rounds Pac-Man cleared.

**How the bot thinks** (`Caza.decidir`, once per tile at the tile centre,
only among legal exits, fully deterministic — ties go straight-first, then
UP/LEFT/DOWN/RIGHT, reverse last):

1. *Threat map*: BFS from every ghost that can kill (normal, or frightened
   with < `AZUL_MARGEN` ticks left; house/leaving ghosts count from the door
   with `CASA_EXTRA`/1 extra tiles; eyes ignored). A ghost's first step
   excludes the tile behind it — ghosts do not reverse.
2. *Safe set*: BFS from the bot that only enters tiles it reaches
   `MARGEN` tiles before any threat. Everything below runs on that set.
3. With power: nearest frightened ghost reachable safely before the power
   ends (`TICKS_CASILLA` per tile + `AZUL_MARGEN`).
4. Fruit if active and ≤ 12 safe tiles away; else the nearest dot — but only
   through exits whose safe subtree holds at least `min(MIN_SEGURAS, max)`
   tiles. That rule is what stopped it from bouncing two tiles back and
   forth between two closing ghosts, which was how it died most of the time.
5. Fewer than `MIN_SEGURAS` safe tiles at all: the exit with the most safe
   tiles behind it. Nothing safe: the exit farthest from the nearest ghost.

Measured in Node against the four machine ghosts (all leaving the house at
once, no energizers): at ×1.0 speed the bot never left round 1; at ×1.1 games
last about three minutes and it clears one round and a bit; at ×1.2 it wins
one in three. `VEL_PAC` is the balance knob.

**Party.** `Party.cazaPick` (leader only, `setCaza`, mutually exclusive with
`habPick`) travels in `proster` and `pstart` (`caza`) and reaches
`onstart(order, idx, cfg, role, hab, caza)`. `canStart()` no longer needs a
Pac-Man seat when it is on; the ghost picker is disabled and the roster shows
the seat's ghost. Local: the CACERÍA card opens a panel with JUGAR SOLO
(Blinky, arrows/WASD) and DOS JUGADORES (Blinky/arrows, Pinky/WASD).
`CFG.NET.PROTO` 7 → 8.

**Replays.** Local replays are not recorded (the entry format has one seat
per player and there is one more here); network replays carry `caza` (`cz` in
the header) and rebuild the bot in spectator mode like any other seat.

## Top mundial integrity (only the Edge Function writes)

**Server-side validation** (`supabase/functions/enviar-record/index.ts`):
submissions no longer go to PostgREST. `Ranking.submit()` POSTs to
`/functions/v1/enviar-record` with the anon key (the gateway's default JWT
check is enough — the anon key *is* a JWT), and the function is the only
writer: `supabase/ranking-integridad.sql` revokes `insert` on `ranking` from
`anon`/`authenticated` and drops the public insert policy, leaving public
`select` untouched. The function inserts with `SUPABASE_SERVICE_ROLE_KEY`,
which bypasses RLS; both env vars are injected by Supabase, no secrets to
create.

Payload: `{ jugadores (1..4), modo, nombre1..nombre4, puntos, nivel, nivelInicio,
fantasmas, tiempoMs, ajustes:{velFantasmas,velPac,powerS,vidas}, tiempo1?,
repeticion? }`.

Checks, all mirroring the tables in `js/config.js` (if a scoring table
changes there, it must change in the function too):

| Check | Rule |
|---|---|
| Score ceiling | per level `240*10 + 4*50` pellets `+ 4*(200+400+800+1600)` ghosts `+ 2*fruit(level)`, summed over `nivelInicio..nivel`, `*1.1` slack |
| Ghosts | `<= 16` per level (4 per energizer, an eaten ghost returns as eyes and cannot be re-eaten in the same fright), and `puntos >= 200*fantasmas` |
| Time | `>= 12 s` per cleared level and `<= 1000` points per second |
| Level-1 mark | only for `jugadores === 1`, `nivelInicio === 1` and untouched speed/fright (`CFG.TIME_RULES`); `>= 20 s`, and it cannot exceed the run's own clock. Failing the settings rule drops `tiempo1` to NULL instead of rejecting the row |
| Settings | rejects anything *easier* than default: `velFantasmas < 1`, `velPac > 1`, `powerS > 1`, `vidas > 3`. Harder settings are fine |
| Name | `nameAllowed()` reimplemented server-side (same leet-folding + `CFG.BAD_WORDS`), control chars stripped, `NICK_MAX` |
| Flood | 5 rows per name per minute, counted over the last minute's rows; the `ranking_freno` trigger stays as a second barrier |

Bounds are deliberately loose — the point is to make 999999 impossible, not
to litigate a great run. Replies are `{ ok, verificado }` on 200 and
`{ ok:false, error, detalle }` on 4xx, where `error` is a short uppercase
string the GAME OVER panel prints as-is and `detalle` goes to the console.
`Ranking.submitError()` maps 404/401/403 (function not deployed yet) to
`NO ESTÁ DISPONIBLE` and logs the deploy command; **a missing function never
breaks a run** — the game only flashes the reason.

**Replays** (`repeticion jsonb`, `verificado boolean`): the v1 format is
`{ v:1, modo, semilla, nivel, jugadores, ajustes, nombres, fecha,
entradas:[[tick,jugador,dir],…], final:{puntos,nivel,fantasmas,tiempoMs} }`.
When one is attached, the function checks it is **structurally** coherent —
version, settings equal to the submitted ones, `final` matching the submitted
score/level/ghosts/time (500 ms slack on the clock), input density plausible
(`<= 20` inputs per second, ticks non-decreasing and inside the run at
60 ticks/s, player index and direction in range) — and sets `verificado`.
An incoherent replay rejects the whole submission: a replay that contradicts
its own score is evidence, not noise.

**Pending: real replay verification.** Nothing here re-simulates the game, so
`verificado` means "the replay does not contradict itself", not "this score
was really achieved". Doing it properly means running the deterministic core
(`config.js`, `pacman.js`, `ghost.js` and the step loop of `game.js`, which
is already seeded and tick-based) inside the function: feed `entradas` at
their ticks, run to game over and compare the resulting score/level/ghosts
against `final`. The blocker is packaging — those modules are browser IIFEs
over `window.PM`, so it needs either a small Deno shim providing a fake
`window` (cheap, but it pins the function to the game's file layout) or a
build step that emits an engine module shared by both. Until then the honest
reading of the column is "worth a look", and the ceiling checks above are
what actually keeps the board clean.

---

## Menú de pausa (P / Esc)

Pausing no longer just dims the maze: it opens a menu (the same `#prompt`
overlay) with up to four actions, each with a keyboard shortcut shown under
the label (`.btn-key`):

| Acción | Tecla | Efecto |
|---|---|---|
| REANUDAR | `P`, `Esc`, `Enter` | unpause (online: coordinated as before) |
| REINICIAR | `R` | new game, same options (`Game.lastOpts`) |
| GUARDAR Y SALIR | `G` | leaves the run where it is, to be continued later (`js/guardado.js`) |
| SALIR | `Q` | back to the menu (online: sends `bye`) |

- GUARDAR Y SALIR only appears where the run can be rebuilt
  (`Guardado.puedeGuardar()`): not in CACERÍA, not online. It is the only exit
  that does **not** cash the run in. A run just resumed names itself in the
  menu's first line (`Game.retomada`, cleared on unpause).

- The menu is state-driven: `UI.syncPrompt()` shows it whenever
  `Game.paused` is true in a game, so in online **both** players see it (the
  pause is coordinated and arrives via `pause` events/snapshots).
  `Game.setPaused(on)` only refreshes the UI when the value actually changes,
  so 12 Hz snapshots never rebuild the dialog under the player's finger.
- REINICIAR is immediate in 1-player and local 2-player; **online it is a
  vote** (`kind: 'restart'`, same machinery as surrender/rematch: request →
  accept/reject, 20 s timeout, host executes and broadcasts `rematch`). A
  rejection/timeout keeps the game paused and shows the notice in the menu's
  status line.
- The menu is **see-through**: `#prompt` uses `rgba(0,0,0,0.45)` and the
  canvas drops its own veil to 0.25 while it is up (0.6 otherwise), so the
  maze stays readable behind it; text gets a shadow and the buttons an opaque
  background for legibility. The GAME OVER panel opts into `.solid` (0.85) —
  there is no live game to look at there. The canvas "PAUSA" label is skipped
  while the menu is up (it would show through underneath).
- Dialog shortcuts in general: buttons declare `keys: [...]`, `showPrompt()`
  registers them in `UI.promptKeys` and `UI.handlePromptKey(ev)` dispatches
  them. While a dialog is open the keyboard drives *only* the dialog (no
  Pac-Man movement). Vote dialogs: `Enter` accepts, `Esc` rejects. GAME OVER
  panel: `R` plays again, `Q`/`Esc` goes to the menu.

## Navegación con flechas (menús y diálogos)

Every panel and dialog is fully keyboard-operable: arrows move the focus,
`Enter`/`Space` activate. `UI.handleNavKey(ev)` runs **before** the dialog
shortcuts and the game input, and only when a panel or a prompt is on screen
(`UI.visiblePanel()` / `promptOpen`), so in-game arrows still drive Pac-Man.

- `UI.navItems(host)` collects the visible focusable controls in DOM order
  (buttons, ranges, text and colour inputs); a hidden tab pane has no layout
  box, so its controls are skipped automatically.
- Up/Down and Left/Right step through that list and wrap around; the focus
  ring is an explicit `:focus` outline (programmatic focus does not always
  count as `:focus-visible`).
- Exceptions that keep native behaviour: Left/Right inside a text field move
  the caret, and Left/Right on a focused slider adjust its value (Up/Down
  still navigate away from it).
- Opening a dialog focuses its primary button, so `Enter` confirms straight
  away. In `.prompt-btns` the hover/focus rules set background *and* colour
  together — setting only one leaves black text on a dark button.

## Pestañas del panel de opciones

OPCIONES is split into three tabs (`UI.tabPanes` / `UI.showOptionsTab`),
because the single scrolling list had grown unusable:

- **DIFICULTAD** — presets, the five sliders and their note.
- **JUGADORES** — names, and per player colour + skin.
- **PARTIDA** — lives mode in 2-player and the in-game key reminder.
- **SONIDO** — mute, the five per-category volume sliders and buttons to
  preview each streak voice.

VOLVER stays outside the tabs. Switching tabs resets the panel scroll.

The header must not move when the tab changes: `#options`/`#badges` drop the
`::before`/`::after` spacers that vertically centre the overlay (otherwise
the block re-centres and the title and tabs jump every time the pane below
changes height) and align to the top instead. The `.tab-row` is `sticky` so
it also stays visible while scrolling a long pane.

**Desktop layout (`min-width: 601px` / `1000px`).** Panels used to be
`position: absolute` inside `#stage`, which is exactly the canvas box (784 px
wide on a 1920×1080 screen, since `fitCanvas` derives the scale from the
window *height*) — everything piled into one narrow column. From 601 px up,
`.overlay:not(#prompt)` is `position: fixed` with a solid `#000` background;
from 1000 px up the content splits into columns. Two breakpoints on purpose:
601–999 px was the worst case (small canvas, content overflowing), and there
the window width already suffices.

`#prompt` is excluded from both: its dialogs sit over a live game and the
translucent veil that keeps the maze visible is the point. `#gameBtns`,
`#emoteBar` and `#chatBox` are injected into `#stage` and positioned against
it, so **`#stage` is the canvas plus whatever is glued to it**: it is a flex
column, and in DESATADO the Q/W/E/R bar (`#habBar`) sits in that flow right
under the maze. `fitCanvas()` subtracts the bar's height from the budget so
the pair still fits and centres as one, and `UI.marcarHabBar()` publishes that
height as `--habH` on `#stage` — `#chatBox` is anchored to the **bottom**, so
without it the chat would land on top of the bar. On touch devices the bar
keeps its old floating corner (`.fija`): down there the D-pad rules, and a bar
under the thumb is worse than a bar slightly further away. See **Modo
DESATADO**.

**Never set `display` on `.overlay` or `.tab-pane` from CSS**: `showPanel()`
and `showOptionsTab()` write it as an inline style, which always wins.
`flex-direction`, `flex-wrap`, `order` and `gap` are fair game — that is what
the column layouts use. (`visiblePanel()` and nine other places also identify
the open panel by `el.style.display !== 'none'`, so moving visibility to a
class would break arrow-key navigation silently.)

The menu is four blocks (`.menu-head`, `.menu-main`, `.menu-side`,
`.menu-cast`, in that DOM order) turned into three columns with `order`. DOM
order stays name → play → side buttons, so arrow keys reach the mode grid
first; `.menu-cast` is visually leftmost but last in the DOM, which is
harmless **only because it contains nothing focusable** — putting a button in
there would make the focus jump across the screen.

**The mode picker** (`UI.MODOS`, `buildModeGrid`, `pickMode`, `stepMode`,
`playPick`) is the whole of `.menu-main`: **one big card at a time** and one
big JUGAR. Before, every mode lived somewhere else — two started from their own
button, the daily challenge opened a dialog, LABERINTOS hid among the side
panels and ONLINE had yet another button — so there was no way to see what you
could play; then they were six equal cards in a grid, which showed everything
at once but gave none of them any weight, so *choosing a mode* — the decision
the front page exists for — felt like ticking a box. Now it is a carousel:
`.mode-arrow` on each side, `.mode-dots` below (clickable, so you can jump
instead of pressing ◀ five times) and the card at `88 px` icon size.

All five cards are built once and live in the DOM together (`drawModeIcon`
paints a canvas, and repainting on every step would show); `refreshModePicker`
shows the picked one and sets `display:none` on the rest — really hidden, so
they cannot be clicked or swept by arrow keys. `.mode-card` has a fixed
`min-height` so the arrows, the description and JUGAR never move. Clicking the
card starts the game (the one you see *is* the picked one, so there is nothing
left to pick there), and `handleNavKey` turns ←/→ into `stepMode` while the
card holds focus — then re-focuses the new card, since the old one just
vanished. `stepMode` wraps around at both ends.

`playPick()` splits the five in two: CLÁSICO and DOS JUGADORES call `newGame`
straight away; LABERINTOS, ONLINE and DESATADO open their panel first, because
each needs a choice before there is a game (which maze, which room, how many
play). DESATADO joined that half the day it became playable by two: its panel
is also the only screen where the keys are written down, and they are not the
same for one player as for two.
`modeTag()` and `modeNota()` are what make the cards live — how
many are in your party — and `refreshReto()` / `refreshOnlineBtn()` now just
call `refreshModePicker()`.

Tabbed panels (OPCIONES, PERFIL) **keep their tabs** at every width — showing
all four panes at once read as clutter. What the width buys is that the
sections *inside* the open pane spread into columns: each is a `.opt-group`
card (`UI.optGroup(pane, title, wide)`), and `.tab-pane` becomes a wrapping
flex row above 1000 px. `.opt-wide` spans the full width for one-line
sections (NOMBRES, the profile header, the avatar grid).

**Scrollbars** are styled to match the cabinet (square blue thumb on a black
track, yellow while dragged, no arrow buttons) with `::-webkit-scrollbar-*`.
The standard `scrollbar-width`/`scrollbar-color` pair lives inside
`@supports not selector(::-webkit-scrollbar)` — Chrome ignores every
`::-webkit-scrollbar-*` rule as soon as it sees those two properties and
falls back to its own rounded bar, so they must only reach Firefox.

## Surrender & rematch (both players must accept)

- **Surrender**: `RENDIRSE` button in the in-game top-right bar (all devices;
  the touch-only `❚❚` pause button sits next to it). 1-player asks for a
  simple confirmation; in any 2-player mode **both must accept**.
- **Rematch**: GAME OVER no longer returns to the menu on its own. After the
  ~3 s label the game stays in `GAME_OVER` with `overIdle = true` and shows a
  panel (names, score, record, level) with "OTRA PARTIDA"/"JUGAR OTRA VEZ"
  and "MENÚ". Local modes restart immediately (`Game.restartGame()` reuses
  `Game.lastOpts`); online it is a vote, and on acceptance the host sends
  `rematch` and both call `newGame` with the same options (same duo, same
  colours, names, host settings and lives mode).
- **Run summary**: closing the run is what awards the last achievements and
  the player-level XP, and those play as animations over the maze. The panel
  therefore **waits for them**: `enterGameOverIdle` sets `overWait =
  celebrating()` (any `achNotice`/`achNotices`/`badgeNotice`/`levelNotice`),
  `Game.stepOverWait()` — called from `step()`, not `stepGameOver()`, so a
  pause cannot strand it — clears the flag and re-syncs, and `syncPrompt`
  only opens the panel when `overIdle && !overWait`. `Game.closeRun()` stores
  `Game.runSummary = {puntos, nivel, exp, lvlAntes, lvl, lvlPct, lvlEn,
  lvlPide, logros[]}` (`logros` accumulated in `Game.runAch` by `bumpAch`),
  and `UI.buildRunSummary()` renders it inside the panel: player level (in
  yellow with "¡SUBES AL NIVEL...!" when it rose), XP gained with the level
  bar, and one row per achievement won in that run (star + name + condition),
  or "SIN LOGROS NUEVOS ESTA VEZ". Spectators get no summary.
- All three (`surrender`, `rematch`, `restart`) share one mechanism
  (`Game.vote = {kind, role, local, ticks}`; texts in `UI.VOTE_TEXT`):
  requester → `vote{k}` → responder accepts/rejects → `voteRes{k, ok}`. The
  **host always executes** (surrender → `gameOver`, rematch → `rematch`); the
  guest waits for the host's event. A surrender vote pauses the game (the
  host owns the pause and broadcasts it) and un-pauses on reject/timeout.
  20 s timeout (`CFG.NET.VOTE_TICKS`), countdown shown in the dialog (only
  the status line is rewritten, never the buttons). Rejections/timeouts show
  a short cyan notice over the maze (`Game.flash`) or in the panel's status.
- Dialogs are HTML overlays (`#prompt`, z-index above the other panels);
  while one is open the D-pads, the pause and surrender buttons and the
  keyboard are disabled. `UI.syncPrompt()` rebuilds the dialog from
  `Game.vote` / `Game.overIdle`, so state and UI cannot drift apart.
- During GAME OVER the connection stays alive (snapshots keep flowing) and
  the 8 s watchdog now also applies there; a peer leaving from the panel
  sends `bye` → "EL OTRO JUGADOR HA SALIDO" → menu.

## Color de Pac-Man

Settings panel offers preset swatches: #ffff00 (clásico), #ff0000, #00ffff,
#00ff00, #ff69b4, #ff8c00, #b19cd9, #ffffff — plus `<input type="color">`.
Applies to Pac-Man body, death animation and lives icons.

## UI text (Spanish)

Title screen: "PAC-MAN" (big, yellow), subtitle "TOP MUNDIAL", buttons
"JUGAR" and "OPCIONES", hint "FLECHAS O WASD PARA MOVERTE · P PARA PAUSA".
Options panel: "OPCIONES", sections "DIFICULTAD" (FÁCIL/NORMAL/DIFÍCIL +
sliders "VELOCIDAD FANTASMAS", "VELOCIDAD PAC-MAN", "DURACIÓN POWER PELLET",
"VIDAS", "NIVEL INICIAL"), "COLOR DE PAC-MAN", "SONIDO" (SÍ/NO), "VOLVER".
In-game: "¡LISTO!", "PAUSA", "GAME OVER" (red). Ghost names on title screen
(classic character/nickname intro is optional).

## Sprites (js/sprites.js — all procedural, PM.Sprites)

- `drawPacman(ctx, x, y, dir, mouthPhase, color)` — filled arc; 3 mouth frames
  (closed / half 40° / open 80°), animates ~every 2 ticks while moving.
- `drawGhost(ctx, x, y, dir, ghostId, mode, animPhase, flashOn)` — dome +
  3-bump wavy skirt (2 alternating skirt frames ~every 8 ticks); eyes with
  pupils looking toward `dir`; body colors Blinky #ff0000, Pinky #ffb8ff,
  Inky #00ffff, Clyde #ffb852; frightened #2121ff body with #ffb8ae face,
  flash swaps to white body/red face; eyes-mode draws only the eyes.
- `drawFruit(ctx, x, y, fruitId)` — 8 fruits as ~14×14 pixel-matrix art
  (cherry, strawberry, peach, apple, grapes, galaxian, bell, key).
- `drawPacFace(ctx, x, y, r, color, exprId)` — emote faces (see below);
  `drawEmote` / `drawBadgeTag` wrap them in the speech bubble.
- Score popups drawn as small cyan text.

## Voces de racha (los únicos archivos de audio)

Eating a frightened ghost plays a voice line — today **"otra alma para
cristo"**, the same one on every kill (20 Sep 2026; it replaced the four
escalating lines "el hueso → el diablo → el huesaso → el diablo coño").

`CFG.VOICES` still holds **one entry per chain position** rather than a single
file, so restoring four distinct lines is a config edit and nothing else; all
four currently point at `audio/otra-alma.m4a`. A file used more than once is
fetched and decoded **once** (`voicePorUrl` + `voicePidiendo` in
`js/audio.js`) — without that, `preloadVoices` pulled the same clip four times
in parallel. OPCIONES shows a single test button while every entry is the same
file: four buttons with the same name suggest four different sounds.

- The streak index is the chain position (`chainIndex` before its increment,
  clamped to 3), the same counter that drives 200/400/800/1600, so it resets
  with every energizer. The chain is **per team**: in 2-player it escalates
  across both players' kills.
- Loaded once via `fetch` + `decodeAudioData` on `AudioSys.init/resume` and
  played through the `voices` bus; a new line stops the previous one so they
  never overlap. Everything fails silently — with `file://` fetch is blocked,
  so the voices simply don't play and the rest of the game sounds the same
  (the SONIDO tab says so when nothing loaded).
- Online the host owns the chain: `evt eatGhost` carries `c` (the streak
  index) and the guest plays that line, so both hear the same escalation.

## Audio API (js/audio.js — window.AudioSys, mostly Web Audio synthesis)

**Volume buses**: `master` feeds `ctx.destination`, and four category buses
feed `master` — `music` (intro), `sfx` (waka, ghost/fruit, death, extra
life), `loops` (siren/fright/retreat ambience) and `voices` (streak lines).
`setVolume(cat, 0..1)` / `getVolume(cat)` drive them, the settings
`volMaster/volMusic/volSfx/volLoops/volVoices` persist them, and `muted`
still forces the master to 0 on top. `blip(..., bus)` picks the category
('sfx' by default).

`init()` (lazy AudioContext), `resume()` (call on first user gesture),
`setMuted(b)`, `playIntro()` → returns duration ms (~4200; two-voice square
melody evoking the classic opener — do NOT transcribe the original score,
compose an evocative original), `playWaka()` (alternating two short chomp
blips, called per dot), `startSiren(stage 0..4)` / `stopSiren()` (looping
pitch-sweep drone, base pitch rises with stage; stage from dots remaining:
>200→0, >130→1, >70→2, >30→3, else 4), `startFright()`/`stopFright()`
(fast warble loop), `startRetreat()`/`stopRetreat()` (high bleep loop while
eyes return), `playEatGhost()`, `playEatFruit()`, `playDeath()` (~1.5 s
descending sweep + sputter), `playExtraLife()`. Only one of
siren/fright/retreat audible at once (retreat > fright > siren priority).
game.js must guard every call (`window.AudioSys && AudioSys.playWaka()`).

**DESATADO one-shots** (all on the `sfx` bus, all short — they fire mid-run
on top of the siren, and a long sound would swallow the waka):
`playBite()` (two hard, very close snaps), `playBiteMiss()` (the same hit,
dull and without the second snap), `playTurbo()` (rising sweep with air),
`playFlash()` (a very short, very bright zap), `playShout()` (descending roar
with vibrato — the longest of the four, because it is the one that changes the
whole board), and the ghost's two, deliberately lower so you can tell which
side a sound came from without looking: `playCharge()` and `playStealth()`.

Every one takes an optional `esc` (1 by default) that scales its volume, and
two rules govern *when* and *how loud*, both in `habilidades.js`:

- **Everybody's powers are audible, but other people's play at 10%**
  (`CFG.HAB.VOL_AJENO`, applied by `son(nombre, ajeno)` off `mio(G, idx)`).
  Somebody having one fewer ability is information about the match, and a bite
  can be heard coming — but at full volume a four-player party is sixteen keys
  fighting the waka. Two on one keyboard both count as "here": there is no
  "the other one" when both are on the same screen.
- Remote powers are voiced where the *effect* lands, which is not always where
  the ability function runs: MORDISCO and GRITO go through their own function
  on the host and come out scaled automatically, while TURBO, FLASH and the
  ghost's two only get *marked* and are voiced explicitly in `peticion` (host)
  and `evento` (echo). `hostEvt` never applies locally, so nothing plays twice.
- **A miss sounds different from a hit.** Before this the four powers were
  mute except for what they dragged in by accident (Q sounded because a ghost
  died, R because fright started), so the two that never touch the scoreboard
  were silent and the key read as broken. `playBiteMiss` also separates the
  two failure modes that used to feel identical: bad aim vs. on cooldown.

## Multiplayer (2 players, local & online)

Menu offers: UN JUGADOR · DOS JUGADORES (same machine) · JUGAR ONLINE ·
OPCIONES. Shared 2-player rules (both modes):

- **Team score**: one scoreboard for both ("EQUIPO" replaces "1UP" in the
  HUD); ghost-eat chain and fruit go to the team. One extra life at 10 000
  (to the pool in shared mode; +1 to each active player in individual mode).
  Separate persisted high score `pacman-topmundial-highscore-2p`.
- **Lives** (`livesMode`): always `'individual'` in team play (18 Sep) — each
  player gets VIDAS lives (icons in each player's color, ≤4 shown with 2
  players, ≤2 with 3–4), a player at 0 becomes a spectator and can be revived
  — the fallen body sits where it dropped for `REVIVIR.CUERPO_TICKS` (15 s) and
  `REVIVIR.PASADAS` (5) passes bring it back with 1 life and a shield, except
  for a **SOPORTE, who needs a single pass** (18 Sep, `Game.esSoporte` /
  `pasadasDe`: reviving is its job, and five laps over a body with the ghosts
  on top is not something anyone does). GAME OVER when everyone is out. `'shared'` (one team pool,
  white icons) survives only for CACERÍA, solo play and old replays, which
  carry their own `livesMode`; the option is gone from the menu and a saved
  `'shared'` is rewritten to `'individual'` on load. Any death runs the
  classic full-reset sequence (ghosts home, global dot counter active).
- **Spawns** (`CFG.STARTS`, indexed by player count): symmetric on the
  classic row — P1 (11.5, 23) facing LEFT, P2 (15.5, 23) facing RIGHT
  ("J1"/"J2" labels shown during READY). 1-player keeps the classic
  (13.5, 23). With **3 and 4** (online party only) the extra players start
  on the top row (11.5/15.5, 5), never beside you; each gets its own colour
  from `CFG.PLAYER_COLORS`.
- **Ghost AI**: each ghost applies its own personality to the nearest alive
  player (euclidean tile distance); Inky still doubles from Blinky's tile;
  Clyde's 8-tile rule uses the chosen player. Players pass through each other.
- **Local controls**: J1 arrows, J2 WASD (1-player keeps arrows+WASD both).

**Online** (host = J1, guest = J2, colors exchanged in the handshake; the
host's difficulty settings + livesMode + startLevel are imposed):

- Rooms: 4-letter code (alphabet without I/O), shareable link `?sala=CODE`
  which auto-joins on load. The lobby **is the party** (see Party): the
  leader is J1 and `pstart` hands out the indices; whoever arrives once the
  game started gets `full` (unless they come to spectate). Protocol version
  `PM.CFG.NET.PROTO` (= 15) must match.
- Transport (`PM.Net`): Supabase Realtime broadcast channels over a minimal
  hand-written Phoenix WebSocket client (heartbeat every 25 s; no database
  usage), credentials in `js/net-config.js` (`PM.NET_CFG`). Dev transport
  via `?red=local` uses BroadcastChannel between two tabs of one browser.
  Every payload is wrapped `{s: senderId, d: data}`; after the handshake
  only the locked peer's messages are accepted.
- **Direct peer links** (`js/net-directo.js`, `PM.Directo`, 19 Sep): WebRTC
  data channels laid **on top of** the Supabase channel, which stays as the
  introducer and the fallback. Measured from Lima, the round trip to Supabase
  is **84 ms** and every message counts against the monthly quota (2 M on the
  free plan ≈ a few dozen 10-minute games); a direct link between two homes in
  one city is 15-25 ms and costs nothing. Mechanics:
  - Discovery is free: any sid seen on the channel becomes a candidate. The
    **lower sid offers**, so two peers never collide negotiating.
  - Signalling rides the channel as the reserved event `~rtc` (`{to, k, …}`,
    `k` = o/a/i for offer, answer, ICE), intercepted by `Net.entrega` before
    the game ever sees it. STUN only (public Google servers) — **no TURN**: the
    ~10 % that cannot link directly simply keep using Supabase, so nothing to
    pay and nothing to run.
  - Two channels per link: `sn` (`ordered:false, maxRetransmits:0`) carries
    `snap`/`pos`, which expire on their own; `ev` (reliable, ordered) carries
    everything else. A lost snapshot is replaced 83 ms later; retransmitting
    it would only head-of-line block what comes after.
  - `Net.send` posts to every live link, and falls back to the channel only
    if someone is still missing — carrying `x: [sids already served]` so they
    drop the duplicate. When every known peer is linked, the paid channel goes
    completely quiet.
  - **Ordering** (`CADUCAN` = snap/pos/gir): those three are numbered (`q`)
    and a late one is dropped by `Net.aTiempo`. Needed because the fast
    channel does not preserve order by design, and because while a link is
    coming up two paths of very different speed coexist (20 ms vs 84). Nothing
    else is numbered — events must all arrive.
  - **Spectators** listen on the channel and have no link with anyone, so the
    host keeps the channel alive while it knows someone is watching
    (`Net.mantenCanal`, renewed by the spectator's `hello {spec:1, hb:1}`
    every 6 s).
  - `?directo=no` turns the whole thing off, for comparing.
- Authority: the **host simulates everything** (ghosts, schedule, house
  counters, Elroy, fruit, score, lives, state machine) and broadcasts
  snapshots every 5 ticks (~12 Hz; every 15th carries the full pellet
  bitmap as hex for self-healing). The **guest simulates only its own
  Pac-Man** locally (zero input lag), sends `pos {x,y,dir,nextDir,eaten[]}`
  every 5 ticks (sooner on turns/eats), and mirrors everything else from
  snapshots, dead-reckoning the host's pac and the ghosts between them.
- **Smooth correction** (`Pacman.ponRemoto` / `pasoError`, 19 Sep): a remote
  pac is guessed between snapshots, so a turn nobody knew about leaves it a
  corridor ahead — and slamming it back was the "teleport" players complained
  about. Now `x, y` take the authoritative value immediately (the host's
  rebroadcast and everything else depend on it) and the difference is parked in
  `errX/errY`, applied as a canvas translation in `Game.drawPac` so the trail,
  accessories and effects travel with it. It decays 0.74 per tick — gone in
  ~8 frames (130 ms). A gap over 3 tiles (`ERR_MAX`) is not a correction but a
  tunnel, FLASH, portal or respawn: those still snap.
- **Turns travel alone** (`gir`, 19 Sep): a snapshot leaves 12 times a second,
  so a turn could sit up to 83 ms inside the host before being passed on —
  which, with the trip each way, put it 170-250 ms behind for everyone else.
  The turn is exactly the datum that breaks prediction, so the guest flags its
  `pos` with `g:1` and the host re-broadcasts `gir {i,x,y,d,nd}` at once (its
  own too, via `hostAvisaGiro`). Cheap: Pac-Man turns a few times a second,
  not twelve.
- Guest prediction (confirmed by host events): eating dots/energizers
  (fright shown immediately), eating frightened ghosts (freeze + hide,
  host validates and replies `eatGhost` with chain points), own death
  (local freeze, host replies `death`). Pause: either player; guest's `P`
  sends `pauseReq`, host applies and broadcasts.
- Robustness: watchdog shows "ESPERANDO CONEXIÓN..." after 1.5 s without
  data and drops with "CONEXIÓN PERDIDA" after 8 s; leaving sends `bye`
  ("EL OTRO JUGADOR HA SALIDO" on the other side → menu). A hidden tab
  keeps simulating via a 100 ms interval pump (rAF stops in background).
- **Host migration (18 Sep, PROTO 14).** Leaving no longer ends anyone
  else's game. A host on its way out first broadcasts
  `mando {n, v, s, x}`: `n` = the seat that takes over (lowest live
  seat, `Game.sucesor()`), `v` = the seat leaving, `s` = a full snapshot
  **with** the pellet bitmap, `x` = what the snapshot omits but the
  simulation needs (`schedIndex/schedTicks`, global dot counter, per-ghost
  `dotCounter`, house failsafe, Elroy block, fruit timer, extra-life flag,
  `contHasta`). The receiver applies both, flips to `netRole: 'host'` and
  keeps simulating; everyone else just records the new `Game.hostIdx`
  (re-announced once as `evt {t:'mando'}` in case the big message was
  lost). No `bye` is sent when the handover succeeds. Any other player
  leaving is now `dropPlayer` (spectator) instead of ending the game, also
  in a duo. The watchdog is muted while `soloEnLaSala()` — otherwise the
  last player standing would time itself out. **Not covered:** a host that
  drops off the network without a handover; nobody holds the snapshot, so
  the game still ends. The new host does not resume replay recording.

### Wire messages (reference)

Every payload travels wrapped as `{s: senderId, d: data}`; once the game
starts only the locked peers are accepted (`Net.lockPeers`), plus `hello`
from third parties. Cells are indices `row*28+col`.

- Party (before the game, same channel): `phello {v, n, c, k}` →
  `proster {v, lider, m:[{s,n,c,k}]}` → `pstart {v, ord:[{s,n,c,k}], cfg}`;
  leaving is `pbye {lider?}`, rejection `pfull {to}`.
- Personal channel `usuario:<nick>`: `invite {code, from}` and
  `donde {}` → `aqui {code, jugando, n}`.
- Spectator: `hello {v, spec:1}` → `svista {v, to, n, nm[], co[], sk[], cfg}`
  plus an immediate full `snap`.
- Guest → host: `pos {x, y, d(ir), nd(nextDir), e:[cell], dy?}` every 5 ticks,
  sooner on turns or eats; `dy:1` while dying (keep-alive whose position the
  host must ignore); `gevt {t: 'died' |
  'ateGhost'{g} | 'ateFruit' | 'pauseReq'{on} | 'vote'{k} | 'voteRes'{k, ok} |
  'emote'{e} | 'chat'{m} | 'badge'{b}}` where `k` is `surrender` | `rematch`
  | `restart` and `b` is a `CFG.BADGES` id ('' = none yet).
- Host → guest: `snap {…}` every 5 ticks (every 15th adds `pm`, hex pellet
  bitmap); `evt {t: 'ready'{lvl,full,rt} | 'fright'{tk,fl} |
  'eatGhost'{g,pts,x,y,w,c:streak} | 'death'{w, g:last?} | 'levelDone' | 'fruitEat'{pts,w} |
  'extraLife' | 'gameOver' | 'pause'{on} | 'vote'{k} | 'voteRes'{k, ok} |
  'rematch' | 'emote'{w, e} | 'chat'{w, m} | 'badge'{w, b} | 'left'{i}}`.
- Both directions: `bye {}` on leaving. With 3 and 4 players a `bye` from a
  guest only benches that player (`left`), it does not end the game.
- `snap` fields: `st ph dph lph dp rt pz` (state/phases/pause), `lvl sc hs`
  (level/score/high), `gm el ft ffl ch` (mode/elroy/fright/chain),
  `fz hg ei` (eat-freeze/hidden ghost/eater), `dl de fa` (dots/fruit),
  `he` (cells eaten since last snap), `lv out` (lives/spectators),
  `pd[i]` (per-player death: `0` or `[phase, ticks]`; the guest ignores its
  own entry), `p0 {x,y,d,nd}` (host pac), `ps[i] {x,y,d,nd}` (every player,
  needed with 3 and 4 where each only knows its own; each client skips its
  own entry), `g[4] {x,y,d,m,f,lp}` (ghosts), `tm` (clock), `pm?`.

## Acceptance checklist (verifiers use this)

1. Loads from file:// with zero console errors; 244 pellets asserted.
2. Ghost targeting matches the four algorithms incl. Pinky/Inky UP-bug;
   tie-break priority and no-reverse rule correct; no-up zones enforced.
3. Scatter/chase schedule + forced reversals + fright timer pause correct.
4. Speed tables, tunnel slowdown, Elroy thresholds applied.
5. House exit counters (personal, global-after-death, failsafe timer).
6. Fruit spawn at 70/170 dots; correct fruit + points per level.
7. Difficulty presets + granular sliders + persistence work; color applies
   live to Pac-Man and lives icons.
8. Sounds: intro, waka, siren stages, fright, eat-ghost, retreat, death,
   fruit, extra life — all synthesized, muteable, and each category
   (music / sfx / loops / voices) with its own volume. The streak voice plays
   per chained ghost (one entry per chain position, all the same line today),
   resets with each energizer, counts the team's kills in 2-player and stays
   in sync online.
9. Full game loop: menu → ready → play → death/level-up → game over → panel
   (play again / menu); pause works; high score persists.
10. Spanish UI throughout; crisp pixel rendering at scale.
11. Two-player modes: team score with its own persisted high score; shared
    lives (default) vs individual (spectator at 0, game over when all out);
    classic full reset on any death; each ghost targets the nearest alive
    player keeping its personality; symmetric spawns labelled with each
    player's name (J1/J2 if unset);
    local controls split (J1 arrows / J2 WASD); 1-player mode unchanged.
12. Online: create/join rooms by 4-letter code and `?sala=` link; host
    settings imposed and colors exchanged; guest's own Pac-Man has no input
    lag; dots, fright, ghost eats, fruit, deaths, level changes, pause and
    game over stay in sync; disconnect/leave notices work; joining a game
    already running is rejected with `full`; version mismatch is reported.
12b. Party: the group survives going back to the menu and finishing a game;
    the leader owns the roster and starts; 3 and 4 players each get their
    own index, spawn and colour; a member who leaves or goes silent is
    benched (with more than two) instead of ending everyone's game;
    invitations reach a friend by name; spectating a friend shows their
    game live without a Pac-Man and never counts as your own game.
13. Mobile: crisp scaling; swipe + on-screen D-pads (one centered, or two
    corner pads in local 2-player) and pause button, shown on touch devices
    only and only during a game; panels full-screen on small viewports;
    menus fully scrollable (no clipped title).
14. Collision is SAME TILE ONLY, in local modes and in the online guest's
    local simulation. Pac-Man and a ghost swapping tiles in the same tick
    pass through each other — the 1980 arcade did exactly that, and the
    original's patterns rely on it, so do NOT "fix" it. Eyes always pass
    through.
15. Names: entered on the title screen (and in OPCIONES, both fields kept in
    sync), saved, sanitised and shown in HUD, READY labels, lobby, dialogs
    and GAME OVER panel; exchanged online in the handshake.
16. Surrender: button during play; 1-player confirms, 2-player needs both
    yeses (online: request → accept/reject, game paused meanwhile, 20 s
    timeout, rejection notice, host executes). GAME OVER offers a rematch
    with the same duo and settings — a vote online, immediate in local
    modes — and no longer drops to the menu by itself.
17. 2-player death: only the dead player freezes and animates; ghosts, the
    schedule and the other player keep going; respawn with a 2 s blinking
    grace; the classic full reset happens only when the last one dies; game
    over when everybody is out. Holds in local and online (guest prediction
    confirmed by the host, no animation restart loops, no position rubber-band
    after respawning). 1-player behaviour is unchanged.
18. Walls drawn inset (thin blocks, wide corridors) with corners closing
    cleanly and the ghost-house door aligned.
19. Pause menu: P/Esc opens REANUDAR / REINICIAR (`R`) / SALIR (`Q`), with
    the shortcut printed on each button and working from the keyboard; both
    players see it online; restarting online is a vote and a rejection leaves
    the game paused. Dialog keys never leak into Pac-Man movement. The menu
    is see-through: the maze reads through it.
21. Arrows navigate every menu and dialog (Enter/Space activate, sliders
    adjust with Left/Right, text fields keep their caret) without stealing
    the arrows from Pac-Man during play. OPCIONES is split into the
    DIFICULTAD / JUGADORES / PARTIDA tabs.
20. Skins apply to the player, its lives icons and the options thumbnails,
    and travel in the online handshake; emotes (`1..6`) appear over the right
    Pac-Man on both screens exactly once; badges are handed out on new
    personal records and listed in MAESTRÍAS; team results reach the TOP
    MUNDIAL panel — one board per format (individual, duo, trio, squad), only
    with a real name for everyone who played, host only online, once per game
    — and a missing table is reported
    instead of crashing; online chat (`T`) delivers
    sanitised, rate-limited messages and blocks game keys while typing.
    Badges are tracked separately **per format** (solo, duo, trio, squad): a
    squad record never awards a duo badge, each track keeps its own record and
    announces its own tiers, and the panel shows the four with their own
    progress. Each tier costs `points × players`, and it is announced only the
    first time it is reached — and never across the maze while anyone else is
    playing.
22. Ghost decisions are taken on tile ENTRY (executed at the center) and the
    scatter↔chase reversal is immediate; frightened choices and the fruit
    timer come from the seeded generator, so the same level replays
    identically twice in a row. Pac-Man crosses a dot corridor at the
    Pac(dots) percentage of the tables (71/79/87), not slower.
23. Watching a friend's game runs on its own channel (`Net.openView` /
    `Net.gameSend`): the watcher's own party keeps its main channel, keeps
    beating and is still there on the way back. If that party starts a game,
    the view closes and the watcher joins it.
24. TOP MUNDIAL has a third board: fastest level 1, read from the
    `ranking_tiempo` view and shown as mm:ss.cc. The time is submitted the
    moment level 1 is cleared (not at game over), once per game, only for
    1 player, offline and with default multipliers and start level.
25. A dialog opened on top of a panel (level-up on returning to the menu,
    invites, watch prompts) gets `#prompt.over-panel` and hides what is
    behind it; over the maze it stays translucent on purpose.
26. Achievements are derived from stored counters (never from a flag), so a
    fresh device that signs in reproduces exactly the same list. Spectating
    records nothing; online counts only the local player's kills and fruit.
27. A skin below its level requirement cannot be selected — except the one
    already worn, which is never taken away. OPCIONES shows the level needed.
28. PERFIL renders every avatar in `CFG.AVATARS` without throwing, and an
    unknown avatar id falls back to the first instead of drawing nothing.
29. Accounts: usuario + contraseña only (no e-mail typed anywhere), usuario is
    the in-game name, and signing in MERGES cloud and local keeping the best of
    each — xp, records and counters never go down. Friends need an account.
30. A run left half-played can be continued: GUARDAR Y SALIR keeps it without
    cashing it in, CONTINUAR rebuilds it from its own replay and hands the
    controls back paused, and signing in on another machine brings it down
    from `perfiles.partida`. If the rebuild does not land on the same score
    it says so instead of resuming something else, and the run is cashed in
    exactly once — when it really ends.
31. A replay plays like a video: a draggable timeline with current and total
    time, ±10 s jumps, four speeds and rewinding, all instant because opening
    it plays it once off-screen leaving photos (`Game.foto`) every 10 s. The
    run is painted with the LOOK OF WHOEVER PLAYED IT — skin, colour,
    accessory and effect ride inside the recording — and replays recorded
    before that still play, with the old look.
32. PERFIL · CIFRAS shows everything known about a player —time played,
    doubles/triples/quadruples, per-world and per-format tables— plus a
    six-axis polygon of strengths, and a rival profile draws their shape over
    yours. Counters added for it are seeded from what was already known,
    never from zero, and the one figure that is an estimate says so.
