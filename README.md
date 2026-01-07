# Lodestone

[![npm](https://img.shields.io/npm/v/@mattzh72/lodestone.svg?style=flat-square)](https://www.npmjs.com/package/@mattzh72/lodestone)
[![MIT License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

Lodestone is a small TypeScript library for programmatic rendering of Minecraft structures in the browser or in headless environments.

![Demo](assets/demo.gif)

It provides:
- A Three.js renderer: `ThreeStructureRenderer`
- A lightweight WebGL renderer: `StructureRenderer`
- Core data types (`Structure`, `BlockState`, `Identifier`) and utilities for meshing Minecraft block models

Repository: https://github.com/mattzh72/lodestone

## Features

- Render Minecraft block models (resource-pack driven)
- Load and render `.litematic` files (Litematica schematic format)
- Chunked meshing + basic culling, transparency, emissive flags
- Works in browsers; can be used headlessly with a WebGL-capable runtime

## Install

```bash
npm install @mattzh72/lodestone
```

`three` is a peer dependency. Many package managers (npm v7+) will install it automatically; if you don’t have it already:

```bash
npm install three
```

## Quick start (default pack)

```ts
import { Structure, ThreeStructureRenderer, loadDefaultPackResources } from '@mattzh72/lodestone'
import { mat4 } from 'gl-matrix'

const { resources } = await loadDefaultPackResources()

const structure = new Structure([4, 3, 4])
structure.addBlock([0, 0, 3], 'minecraft:stone')
structure.addBlock([0, 1, 3], 'minecraft:cactus', { age: '1' })

const renderer = new ThreeStructureRenderer(canvas, structure, resources)
renderer.setViewport(0, 0, canvas.width, canvas.height)

const view = mat4.create()
mat4.translate(view, view, [0, 0, -5])
renderer.drawStructure(view)
```

For a more complete example (including item rendering and controls), see `demo/main.ts`.

## Loading Litematic files

Lodestone can load and render `.litematic` files (Minecraft schematic format used by Litematica mod):

```ts
import { LitematicLoader, ThreeStructureRenderer, loadDefaultPackResources } from '@mattzh72/lodestone'

// Load litematic file
const response = await fetch('path/to/build.litematic')
const buffer = await response.arrayBuffer()
const structure = LitematicLoader.load(new Uint8Array(buffer))

// Get metadata
const metadata = LitematicLoader.getMetadata(new Uint8Array(buffer))
console.log(metadata.name, metadata.author, metadata.totalBlocks)

// Render it
const { resources } = await loadDefaultPackResources()
const renderer = new ThreeStructureRenderer(canvas, structure, resources)
```

The loader handles:
- Gzip-compressed NBT parsing
- Variable-width bit-packed block state arrays
- Block palettes and properties
- Multiple regions (loads first region by default)

## Demo

Run the local demo:

```bash
npm install
npm run demo
```

## CDN (UMD)

Load Three.js first, then Lodestone. The UMD bundle exposes `window.Lodestone`.

Pinned (recommended for reproducible builds):

```html
<script src="https://unpkg.com/three@0.164.1/build/three.min.js"></script>
<script src="https://unpkg.com/@mattzh72/lodestone@0.1.0/dist/lodestone.umd.cjs"></script>
<script>
  // Load the built-in default pack from unpkg:
  // https://unpkg.com/@mattzh72/lodestone@0.1.0/assets/default-pack/
  (async () => {
    const baseUrl = 'https://unpkg.com/@mattzh72/lodestone@0.1.0/assets/default-pack/'
    const { resources } = await Lodestone.loadDefaultPackResources({ baseUrl })
    // ...use `resources` with `ThreeStructureRenderer`
  })()
</script>
```

Or `@latest` (convenient, but can change underneath you):

```html
<script src="https://unpkg.com/three@0.164.1/build/three.min.js"></script>
<script src="https://unpkg.com/@mattzh72/lodestone@latest/dist/lodestone.umd.cjs"></script>
<script>
  const { Structure, ThreeStructureRenderer } = window.Lodestone
</script>
```

## Resources (what you supply)

If you want to use your own resource pack instead of the built-in default pack, you provide a `Resources` object that can answer:
- block definitions (`blockstates/*.json`)
- block models (`models/*.json`)
- a texture atlas (`ImageData`) and UV lookup
- simple per-block flags (opaque / transparent / emissive, etc.)

The `demo/` folder shows one concrete way to load these inputs.

## Contributing

Issues and PRs are welcome: https://github.com/mattzh72/lodestone/issues

## License

MIT. Lodestone includes upstream MIT-licensed code from Misode (deepslate).

---

Made with ❤️ in San Francisco.

Special thanks to [deepslate](https://github.com/misode/deepslate) - Lodestone is an optimized, Three.js-native version of their work.
