# lodestone

Rendering and core utilities for programmatic Minecraft scenes (Three.js + WebGL).

This is a focused fork of Misode's deepslate that keeps core/rendering functionality and trims worldgen.

Repository: https://github.com/mattzh72/lodestone

## Install

```bash
npm install @mattzh72/lodestone three
```

## CDN (UMD)

```html
<script src="https://unpkg.com/three@0.164.1/build/three.min.js"></script>
<script src="https://unpkg.com/@mattzh72/lodestone@0.1.0/dist/lodestone.umd.cjs"></script>
```

The UMD bundle exposes `window.Lodestone`.

## Quick Start

```ts
import { BlockDefinition, BlockModel, Structure, TextureAtlas, ThreeStructureRenderer } from '@mattzh72/lodestone'
import { mat4 } from 'gl-matrix'

const structure = new Structure([4, 3, 4])
structure.addBlock([0, 0, 3], 'minecraft:stone')
structure.addBlock([0, 1, 3], 'minecraft:cactus', { age: '1' })

// Resources: provide block definitions/models and an atlas.
const resources = {
  getBlockDefinition: (id) => blockDefinitions[id.toString()] ?? null,
  getBlockModel: (id) => blockModels[id.toString()] ?? null,
  getTextureAtlas: () => textureAtlas.getTextureAtlas(),
  getTextureUV: (id) => textureAtlas.getTextureUV(id),
  getPixelSize: () => textureAtlas.getPixelSize(),
  getBlockFlags: () => ({ opaque: true }),
  getBlockProperties: () => null,
  getDefaultBlockProperties: () => null,
}

const renderer = new ThreeStructureRenderer(canvas, structure, resources, {
  chunkSize: 16,
  drawDistance: 256,
})

const view = mat4.create()
mat4.translate(view, view, [0, 0, -5])
renderer.drawStructure(view)
```

## Resources Notes

- `TextureAtlas.fromBlobs()` and `TextureAtlas.empty()` use the DOM; in Node, build an `ImageData` via `canvas` and use `new TextureAtlas(imageData, uvMap)`.
- `three` is a peer dependency. If you use the UMD bundle, load Three.js first and access `window.Lodestone`.

## Rendering Caveats

- Texture atlases must be power-of-two dimensions.
- Very large meshes may require WebGL2 or the `OES_element_index_uint` extension for 32-bit indices.

## License

MIT. Includes upstream MIT code from Misode.
