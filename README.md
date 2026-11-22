# Xbox Minecraft Battle Mode Browser Edition

![Minecraft Xbox Battle mode](https://i.ytimg.com/vi/rK0_e5PxOhw/maxresdefault.jpg)

Xbox Minecraft Battle Mode Browser Edition is a fan-made, browser-based tribute to the Legacy Console Edition **Battle** mini game, plus a Battle Royale mode ported from the MCBR datapack. Single HTML file, WebGL, no build step needed to play.

> Not affiliated with Mojang or Microsoft. All code and built-in art are original; Minecraft textures and sounds are only used if you load your own resource pack.

## Play

Open `index.html` in a browser, or host it with GitHub Pages (below).

- **Play Game**: Battle vs bots on Temple, Cavern, Cove, Crucible or Skyhold
- **Temple** (new): a ruined stone-brick temple deep in a jungle cave, after the Battle key art: centre chests inside the temple and in the shrine on top (ladder inside), a lily-pad moat you can cross by bridge, stepping stones or the lily pads themselves, a jungle floor with ruins and trees, and a gallery round the cave wall
- **Bots that play like players**: they keep a sensible inventory, loot, then go hunting (with route-finding over stairs, ladders and drops), shoot with bows at people they can't reach, and give up on anything they can't get to instead of standing still
- **Play Online** (in Mini Games): online rooms through the game's own server or relay (or "same browser, other tabs" for testing)
- **Enchanted items**: Sharpness, Knockback and Fire Aspect swords and axes; Power, Punch, Flame and Infinity bows; Protection armour. They show a purple glint, list their enchantments in the inventory tooltip, and turn up in chests (more often in the centre ones). Turn them off with **Enchanted Loot** in Game Rules.
- **Console look and feel** (matched to Xbox One Edition Battle footage): raised console HUD with the 8-slot player colour strip, a small animated model of you on the left, kill messages in the chat area, contextual button prompts, "Invulnerability wears off / has worn off! Fight!" messages, rounds that start behind a "Downloading terrain" loading screen with tips, block info panels when you look at a block, and an end-of-round scoreboard with kills, awards, favourite weapon, damage inflicted/received and round time. In-Game Tooltips and Animated Character can be turned off in Video Settings.
- **Practice**: lobby town with a movement playground (ice, slime, soul sand, cobwebs, ladders, slabs, stairs, water)
- **Help & Options**: name, skin, round length, hunger rate, item respawn, grace period, Showdown, Take Everything, central spawn, bots, maps, Battle Royale settings

### Controls

| Key | Action |
| --- | --- |
| WASD | Move |
| Space | Jump / swim up / climb |
| Shift | Sneak |
| Ctrl or double-tap W | Sprint |
| Left click | Attack (hold to mine in Battle Royale) |
| Right click | Open chest, eat/drink/draw bow (hold), throw splash potion, block with sword, equip armour, place block |
| 1-9 / wheel | Hotbar |
| E | Chest |
| Q | Drop item |
| R / Tab | Ready / lobby panel (online) |
| Esc | Pause |

## Host on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo: **Settings > Pages > Build and deployment**, set **Source** to *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. After a minute the game is live at `https://<your-username>.github.io/<repo-name>/`.

### Online multiplayer (our own system, no Photon)

The game has its own multiplayer system: a small room relay that every player in a room talks to. The first player in a room is the host and runs the bots, chests and round timer; if they leave, the next player takes over.

**Option A: run the game's own server (best).** `server/server.js` is one Node.js file with no packages to install. It serves the game *and* the multiplayer relay on the same address:

```
node server/server.js          # or: npm start   (needs Node.js 18+)
```

Open `http://localhost:8080` (or your PC's address, e.g. `http://192.168.1.20:8080`, for friends on the same Wi-Fi). Players who open the game from that address connect to it automatically. Free hosts that run Node apps (Render, Railway, Fly.io, Glitch, a Replit, your own PC with port forwarding) work too: point them at this repo with the start command `npm start`. Check `/health` on the server to see rooms and players.

**Option B: GitHub Pages with no server.** Mini Games → Play Online → Connect also works on GitHub Pages: if there's no game server, it falls back to free public relays (EMQX, HiveMQ, Mosquitto test broker). Anyone who knows the room code can join those, so pick an unusual code.

To use a game server from the GitHub Pages copy, type its address in **Game server (optional)** on the Play Online screen, or open the page with `?relay=wss://your-server/mqtt`.

### Resource packs

Players can load any Java Edition resource pack (`.zip`) or a client `.jar` they own from **Resource Packs**. Packs are kept in that browser only. Both 1.8 and modern file names are supported, including `sounds.json` sound events.

**Java keys:** F5 cycles first person / third person behind / in front, F1 hides the GUI, F3 shows the debug screen, T (or /) opens chat in multiplayer.

**Options & mobile:** Help & Options opens Java-style Options screens (Video Settings, Music & Sounds, Controls, Game Rules, Maps). Mobile Controls (Auto/ON/OFF) adds a touch joystick, drag-to-look, tap-to-attack, hold-to-use and buttons for jump, sneak, sprint, inventory and drop. Settings are saved in the browser.

**Default packs:** `pack.zip` (Template Resource Pack 1.8) and `sounds.zip` (Enhanced Audio r7) sit beside `index.html` and load automatically when the page is hosted (GitHub Pages, or any local web server). Browsers block this when you double-click `index.html` from disk, so either host it or load the packs once from the Texture Packs menu.

**Dressing Room:** the player preview beside the title menu opens the Dressing Room, where you can set your name and import your own skin (64x64 or legacy 64x32 PNG). Imported skins are saved in your browser and sent to other players in online games.

**Title logo:** `logo.png` beside `index.html` is the default title logo (loaded automatically when hosted). Replace it with another image, or pick one under Texture Packs → Title logo image.

## Editing the code

The game lives in `src/` (numbered JavaScript files plus `shell.html`). After editing, rebuild the single file:

```
python3 build.py
```

| File | What it does |
| --- | --- |
| `01_core.js` | Math, noise, zip reader |
| `02_blocks.js` | Blocks, shapes, procedural textures |
| `03_items.js` | Items, 1.8 stats, loot tables, icons |
| `04_world.js` | Maps (Battle maps, lobby town, Battle Royale), lighting |
| `04b_maps.js` | Cove, Crucible and Temple |
| `05_gl.js` | WebGL, chunk meshes, models, item meshes |
| `06_pack.js` | Resource pack loader |
| `07_game.js` | Entities, combat, hunger, effects, projectiles, drops |
| `07b_mcphys.js` | Java Edition movement physics (20 TPS) |
| `08_net.js` | Multiplayer: room relay client (MQTT over WebSocket) and same-browser tabs |
| `09_flow.js` | Match flow, lobby, chests, MCBR timeline, net events |
| `10_bots.js` | Bot AI, including route-finding |
| `11_render.js` | Audio and rendering |
| `12_hud.js` | HUD |
| `13_ui.js` | Menus, input, local player |
| `14_main.js` | Main loop |

## Credits

- Battle Royale rules and the Easter-head structure follow the MinecraftBattleRoyale datapack by Zakru.
- Inspired by Minecraft: Legacy Console Edition Battle by 4J Studios / Mojang.
