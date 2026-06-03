# Resources and Default Pack

These docs describe Lodestone `0.6.0`.

## Imports

```ts
import {
  loadDefaultPackResources,
  getBundledDefaultPackUrls,
  getDefaultPackUrls,
  createResourcesFromPack,
} from '@mattzh72/lodestone'
```

## `Resources`

Renderer resources are supplied through the `Resources` interface.

Required methods:

- `getBlockDefinition(id): BlockDefinition | null`
- `getBlockModel(id): BlockModel | null`
- `getTextureUV(id): [number, number, number, number] | null`
- `getTextureAtlas(): ImageData`
- `getPixelSize(): number`
- `getBlockFlags(id): BlockFlags | null`
- `getBlockProperties(id): Record<string, string[]> | null`
- `getDefaultBlockProperties(id): Record<string, string> | null`

Supported `BlockFlags` fields:

- `opaque?: boolean`
- `semi_transparent?: boolean`
- `self_culling?: boolean`
- `emissive?: boolean`
- `emissiveIntensity?: number`
- `emissiveConditional?: string`

Unsupported:

- Lodestone does not currently require `getBlockProperties` or `getDefaultBlockProperties` for the bundled default pack; default implementation returns `null`.
- Lodestone does not validate resource packs against a Minecraft version.

## `getBundledDefaultPackUrls()`

Returns URLs for the built-in default pack included with the package.

Return fields:

- `baseUrl`
- `assetsJson`
- `atlasPng`
- `blockFlags.opaqueTxt`
- `blockFlags.transparentTxt`
- `blockFlags.nonSelfCullingTxt`
- `blockFlags.emissiveJson`

Behavior:

- Uses `import.meta.url` to locate package assets.
- In a bundled app, make sure the assets are served from a reachable URL.

## `getDefaultPackUrls(baseUrl)`

Builds default pack URLs from a base URL.

Supported fields:

- `baseUrl: string | URL`

Behavior:

- Ensures the base path ends with `/`.

## `loadDefaultPackResources(options?)`

Loads the bundled or externally hosted default resource pack.

Supported fields:

- `options.baseUrl?: string | URL`
  - When omitted, uses `getBundledDefaultPackUrls()`.
- `options.fetch?: typeof globalThis.fetch`
  - When omitted, uses `globalThis.fetch`.

Return value:

```ts
{
  urls: DefaultPackUrls,
  assets: {
    blockstates: Record<string, unknown>,
    models: Record<string, unknown>,
    textures: Record<string, [number, number, number, number]>,
  },
  atlas: {
    imageData: ImageData,
    atlasSize: number,
  },
  resources: Resources,
}
```

Validation:

- Throws if `fetch` is unavailable.
- Throws if any required asset fetch fails.
- Throws if atlas decoding fails.

Runtime requirements:

- `fetch`
- `Blob`
- `createImageBitmap`
- `OffscreenCanvas` or DOM canvas
- `ImageData`

## `createResourcesFromPack(input)`

Creates a `Resources` object from decoded default-pack-style assets.

Supported fields:

- `input.assets.blockstates: Record<string, unknown>`
- `input.assets.models: Record<string, unknown>`
- `input.assets.textures: Record<string, [number, number, number, number]>`
- `input.atlas.imageData: ImageData`
- `input.atlas.atlasSize: number`
- `input.flags.opaque?: Set<string>`
- `input.flags.transparent?: Set<string>`
- `input.flags.nonSelfCulling?: Set<string>`
- `input.flags.emissive?: Record<string, { intensity?: number, conditional?: string }>`

Behavior:

- Prefixes asset ids with `minecraft:`.
- Flattens block model parent chains.
- Builds texture UVs against the atlas size.
- Uses flag files to determine opacity, transparency, self-culling, and emissive behavior.

Unsupported:

- Loading arbitrary zipped Minecraft resource packs directly.
- Merging multiple packs.
- Version-specific resource-pack validation.

## Default Pack Coverage

The bundled default pack is intended for vanilla Minecraft block rendering coverage used by Lodestone examples and previews.

Supported:

- Built-in `assets/default-pack/assets.json`
- Built-in `assets/default-pack/atlas.png`
- Built-in block flags:
  - `opaque.txt`
  - `transparent.txt`
  - `non_self_culling.txt`
  - `emissive.json`

Unsupported:

- Custom modded blocks unless their blockstates, models, textures, and flags are supplied by a compatible `Resources` object.
- Entity models.
- Item/block entity renderers beyond Lodestone's implemented special renderers.
