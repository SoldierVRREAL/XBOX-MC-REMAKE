# Xbox Minecraft Battle Mode Browser Edition

![Minecraft Xbox Battle mode](https://i.ytimg.com/vi/rK0_e5PxOhw/maxresdefault.jpg)

Xbox Minecraft Battle Mode Browser Edition is a fan-made, browser-based tribute to the Legacy Console Edition **Battle** mini game, plus a Battle Royale mode ported from the MCBR datapack. Single HTML file, WebGL, no build step needed to play.

> Not affiliated with Mojang or Microsoft. All code and built-in art are original; Minecraft textures and sounds are only used if you load your own resource pack.

## Play

Open `index.html` in a browser, or host it with GitHub Pages (below).

- **Play Game**: Battle vs bots on Cavern, Cove, Crucible or Skyhold
- **Play Online**: Photon Realtime rooms (or "same browser, other tabs" for testing)
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

### Online multiplayer (Photon)

1. Create a free **Photon Realtime** app at dashboard.photonengine.com and copy its AppId.
2. Download the Photon JavaScript SDK and put `photon.min.js` next to `index.html` (or paste its URL in Play Online).
3. Put the AppId in Play Online (it's remembered), or change `DEFAULT_APPID` in `src/13_ui.js` and rebuild.

### Resource packs

Players can load any Java Edition resource pack (`.zip`) or a client `.jar` they own from **Resource Packs**. Packs are kept in that browser only. Both 1.8 and modern file names are supported, including `sounds.json` sound events.

If you have the rights to share a pack, you can also place it beside `index.html` as `pack.zip` (textures) and/or `sounds.zip` (sounds) and it loads automatically for everyone. These names are git-ignored by default.

**Dressing Room:** the player preview beside the title menu opens the Dressing Room, where you can set your name and import your own skin (64x64 or legacy 64x32 PNG). Imported skins are saved in your browser and sent to other players in online games.

**Title logo:** put an image named `logo.png` beside `index.html` (or pick one under Resource Packs → Title logo image) and it replaces the drawn logo on the title screen. `logo.png` is git-ignored too, since logos usually belong to someone else.

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
| `05_gl.js` | WebGL, chunk meshes, models, item meshes |
| `06_pack.js` | Resource pack loader |
| `07_game.js` | Entities, combat, hunger, effects, projectiles, drops |
| `07b_mcphys.js` | Java Edition movement physics (20 TPS) |
| `08_net.js` | Photon / BroadcastChannel networking |
| `09_flow.js` | Match flow, lobby, chests, MCBR timeline, net events |
| `10_bots.js` | Bot AI |
| `11_render.js` | Audio and rendering |
| `12_hud.js` | HUD |
| `13_ui.js` | Menus, input, local player |
| `14_main.js` | Main loop |

## Credits

- Battle Royale rules and the Easter-head structure follow the MinecraftBattleRoyale datapack by Zakru.
- Inspired by Minecraft: Legacy Console Edition Battle by 4J Studios / Mojang.
