# Examples

These docs describe Lodestone `0.6.0`.

## Build and Export a Watchtower-Like Shell

```ts
import { Structure } from '@mattzh72/lodestone'
import fs from 'node:fs/promises'

const structure = new Structure([9, 8, 9])

for (let x = 0; x < 9; x += 1) {
  for (let z = 0; z < 9; z += 1) {
    structure.addBlock([x, 0, z], 'minecraft:stone_bricks')
  }
}

for (let y = 1; y <= 5; y += 1) {
  for (let x = 2; x <= 6; x += 1) {
    structure.addBlock([x, y, 2], 'minecraft:spruce_planks')
    structure.addBlock([x, y, 6], 'minecraft:spruce_planks')
  }
  for (let z = 2; z <= 6; z += 1) {
    structure.addBlock([2, y, z], 'minecraft:spruce_planks')
    structure.addBlock([6, y, z], 'minecraft:spruce_planks')
  }
}

structure.addBlock([4, 3, 2], 'minecraft:glass_pane')
structure.addBlock([4, 3, 6], 'minecraft:glass_pane')
structure.addBlock([2, 3, 4], 'minecraft:glass_pane')
structure.addBlock([6, 3, 4], 'minecraft:glass_pane')

const bytes = structure.writeNbt({
  dataVersion: 3465,
  compression: 'gzip',
  updateBlockStates: true,
})

await fs.writeFile('watchtower.nbt', bytes)
```

## Add a Block Entity

```ts
import { NbtCompound, NbtString, Structure } from '@mattzh72/lodestone'

const structure = new Structure([3, 3, 3])
const chestNbt = new NbtCompound()
  .set('id', new NbtString('minecraft:chest'))
  .set('CustomName', new NbtString('{"text":"Supplies"}'))

structure.addBlock([1, 1, 1], 'minecraft:chest', { facing: 'north' }, chestNbt)
```

## Read and Re-Export a Structure

```ts
import { NbtFile, Structure } from '@mattzh72/lodestone'
import fs from 'node:fs/promises'

const file = NbtFile.read(new Uint8Array(await fs.readFile('input.nbt')))
const structure = Structure.fromNbt(file.root)
structure.addBlock([0, 0, 0], 'minecraft:diamond_block')

await fs.writeFile('output.nbt', structure.writeNbt({
  dataVersion: 3465,
  compression: 'gzip',
  updateBlockStates: true,
}))
```

## Render With a Programmatic Camera

```ts
import { NbtFile, Structure, ThreeStructureRenderer, loadDefaultPackResources } from '@mattzh72/lodestone'

const response = await fetch('/build.nbt')
const file = NbtFile.read(new Uint8Array(await response.arrayBuffer()))
const structure = Structure.fromNbt(file.root)
const { resources } = await loadDefaultPackResources()

const canvas = document.querySelector('canvas')!
const renderer = new ThreeStructureRenderer(canvas, structure, resources, {
  antialias: true,
  preserveDrawingBuffer: true,
})

renderer.setViewport(0, 0, canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio)
renderer.lookAt([12, 10, 16], [4.5, 3, 4.5], [0, 1, 0])
renderer.drawStructure()

const camera = renderer.getCamera()
console.log(camera.position, camera.target, camera.fov)
```

## Use an Existing View Matrix

```ts
import { mat4 } from 'gl-matrix'

const view = mat4.create()
mat4.lookAt(view, [12, 10, 16], [4.5, 3, 4.5], [0, 1, 0])
renderer.drawStructure(view)
```

## Load Default Pack From a Custom Base URL

```ts
import { loadDefaultPackResources } from '@mattzh72/lodestone'

const { resources } = await loadDefaultPackResources({
  baseUrl: '/vendor/lodestone/default-pack/',
})
```

The base URL must serve:

- `assets.json`
- `atlas.png`
- `block-flags/opaque.txt`
- `block-flags/transparent.txt`
- `block-flags/non_self_culling.txt`
- `block-flags/emissive.json`
