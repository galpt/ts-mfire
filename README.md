# ts-mfire

A small, focused TypeScript port of `go-mfire` that demonstrates how to parse [MangaFire](https://mangafire.to) and perform searches which require the site's `vrf` token.

<p align="center">
	<img src="https://github.com/galpt/ts-mfire/blob/main/screenshot/how-it-looks-like.jpg" alt="Interface preview" style="max-width:100%;height:auto;" />
	<br/>
	<em>How it looks like</em>
</p>

> [!IMPORTANT]
> Educational purpose only — this project is provided under the MIT license. It is not intended to help circumvent paywalls, license restrictions, or facilitate piracy. Use it for learning and experimentation and respect site terms.

## Table of contents

- [Status](#status)
- [What it does](#what-it-does)
- [Quick start (Windows PowerShell)](#quick-start-windows-powershell)
- [Usage notes](#usage-notes)
- [Developer notes](#developer-notes)
- [Configuration — VRF cache](#configuration--vrf-cache)
	- [Environment variable (recommended)](#1-environment-variable-recommended)
	- [Programmatically](#2-programmatically)
- [Contributing](#contributing)
- [License](#license)

## Status

- Minimal CLI implemented and compiled via `tsc`.
- Home-page listing and search support (limited to 10 results).
- VRF token generation ported from the original Go implementation and wired into search.

## What it does

- Fetches and shows up to 10 manga titles from the MangaFire home page.
- Provides an interactive CLI (compiled to `dist/bin/mfire.js`) to view a title's URL or run a text search.
- Implements MangaFire's `vrf` token generator so searches work reliably.

## Quick start (Windows PowerShell)

1. Install dependencies and build:

```powershell
cd ts-mfire; npm install; npm run build
```

2. Run the compiled CLI:

```powershell
npm start
# or directly
node ./dist/bin/mfire.js
```

> [!TIP]
> TypeScript build requires `typescript` and type declarations. `@types/node` is added as a devDependency; the code prefers Node 18+ for global `fetch`.

> [!NOTE]
> `puppeteer` is included in `dependencies` and will download a bundled Chromium during `npm install`. If you prefer not to download Chromium, you can remove `puppeteer` from `package.json` — the CLI will still fetch and parse the home page, but the browser-based fallback used to obtain a server `vrf` token when searches return `403` will be unavailable (searches that result in 403 may fail).

## Usage notes

- On start the CLI prints up to 10 titles found on the home page.
- Type a number to print the selected title's URL.
- Type `search` and enter a query to fetch up to 10 search results.
- Type `exit` to quit.

## Developer notes

- Source: `src/` contains the TypeScript sources. After building the output is in `dist/`.
- Library exports are available from `src/index.ts` (and from `dist/index.js` after build).
- Network: client code prefers the platform `fetch` (Node 18+) and falls back to an optional Puppeteer-based headless browser for vrf recovery when the server returns `403`.

- Note on Node and fetch: this project expects a global `fetch` implementation (Node 18+). If you run an older Node.js version, provide a compatible global (for example `node-fetch`) before using the CLI or library.

## Configuration — VRF cache

The VRF generator is moderately expensive to compute, so the package keeps an in-memory LRU cache to avoid recomputing tokens for repeated queries. You can configure the cache size in two ways:

### 1) Environment variable (recommended)

Set `MGFIRE_VRF_CACHE_SIZE` to a positive integer before launching the CLI. Example (PowerShell):

```powershell
$env:MGFIRE_VRF_CACHE_SIZE = "2048"; npm start
```

### 2) Programmatically

If you use the library from code, call `SetVrfCacheSize(n)` early in your program. Use `GetVrfCacheSize()` to inspect the current capacity.

> [!NOTE]
> Default cache size: `1024` entries. Passing a non-positive value to `SetVrfCacheSize` is a no-op.

## Contributing

Contributions welcome. Open an issue or send a pull request for bugs, tests, or enhancements. If you'd like a smaller library-only API (no CLI), say so and an example usage can be added.

## License

MIT — see the `LICENSE` file.
