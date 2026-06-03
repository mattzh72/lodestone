# Getting Started

These docs describe Lodestone `0.6.0`.

## Install

```bash
npm install @mattzh72/lodestone three
```

Lodestone is an ES module package. Import public APIs from the package root unless you have a reason to use subpath exports:

```ts
import { Structure, NbtFile, ThreeStructureRenderer, loadDefaultPackResources } from '@mattzh72/lodestone'
```

Supported subpath exports:

- `@mattzh72/lodestone/core`
- `@mattzh72/lodestone/math`
- `@mattzh72/lodestone/nbt`
- `@mattzh72/lodestone/render`
- `@mattzh72/lodestone/util`

## Create and Export a Structure

```ts
import { Structure } from '@mattzh72/lodestone'
import fs from 'node:fs/promises'

const structure = new Structure([5, 4, 5])
structure.addBlock([0, 0, 0], 'minecraft:stone')
structure.addBlock([1, 0, 0], 'minecraft:oak_fence')
structure.addBlock([2, 0, 0], 'minecraft:oak_fence')

const bytes = structure.writeNbt({
  dataVersion: 3465,
  compression: 'gzip',
  updateBlockStates: true,
})

await fs.writeFile('build.nbt', bytes)
```

## Read a Structure NBT File

```ts
import { NbtFile, Structure } from '@mattzh72/lodestone'
import fs from 'node:fs/promises'

const bytes = new Uint8Array(await fs.readFile('build.nbt'))
const file = NbtFile.read(bytes)
const structure = Structure.fromNbt(file.root)
```

## Render a Structure

```ts
import { Structure, ThreeStructureRenderer, loadDefaultPackResources } from '@mattzh72/lodestone'

const { resources } = await loadDefaultPackResources()
const structure = new Structure([5, 4, 5])
structure.addBlock([0, 0, 0], 'minecraft:stone')

const canvas = document.querySelector('canvas')!
const renderer = new ThreeStructureRenderer(canvas, structure, resources)
renderer.setViewport(0, 0, canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio)
renderer.lookAt([4, 5, 8], [2.5, 2, 2.5])
renderer.drawStructure()
```

## Supported Runtime Surfaces

Supported:

- TypeScript and JavaScript ES modules.
- Browser rendering with WebGL through Three.js.
- Node.js structure and NBT generation.
- Browser or worker resource loading when `fetch`, `Blob`, `ImageData`, and canvas decoding APIs are available.

Unsupported:

- CommonJS `require`.
- Rendering without WebGL.
- Full Minecraft simulation, world generation, lighting simulation, redstone simulation, or entity simulation.
