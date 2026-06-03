# Supported Fields and Defaults

These docs describe Lodestone `0.6.0`.

This file is a quick contract reference for public option fields and object shapes.

## `StructureNbtOptions`

Supported fields:

- `dataVersion?: number`
- `updateBlockStates?: boolean`

Defaults:

- `updateBlockStates`: `false`
- `dataVersion`: omitted

No other fields are read.

## `StructureNbtWriteOptions`

Supported fields:

- `name?: string`
- `compression?: 'gzip' | 'zlib' | 'none'`
- `dataVersion?: number`
- `updateBlockStates?: boolean`

Defaults:

- `name`: `''`
- `compression`: `'gzip'`
- `updateBlockStates`: `false`
- `dataVersion`: omitted

No other fields are read.

## `StructureBlockStateUpdateResult`

Fields:

- `updatedBlocks: number`

Meaning:

- Count of blocks whose state was changed by `updateBlockStates()`.
- A second immediate call should return `0` for the currently supported updates.

## `PlacedBlock`

Fields:

- `pos: [number, number, number]`
- `state: BlockState`
- `nbt?: NbtCompound`

## Stored Structure Block Entries

Internal constructor block entries use:

- `pos: [number, number, number]`
- `state: number`
- `nbt?: NbtCompound`

`state` is a palette index.

## `BlockState` Constructor

Supported fields:

- `name: string | Identifier`
- `properties?: Record<string, string>`

Defaults:

- `properties`: `{}`
- Missing namespace in string names defaults to `minecraft`.

No other fields are read.

## Block-State String Parser

Supported:

- `minecraft:stone`
- `stone`
- `minecraft:oak_stairs[facing=east,half=bottom,shape=straight]`

Unsupported:

- Escaped commas in property values.
- Escaped equals signs in property values.
- Validation against Minecraft registries.

## `NbtCreateOptions`

Supported fields:

- `name?: string`
- `compression?: 'gzip' | 'zlib' | 'none'`
- `littleEndian?: boolean`
- `bedrockHeader?: number | boolean`

Defaults:

- `name`: `''`
- `compression`: `'none'`
- `littleEndian`: `false`, unless `bedrockHeader` is set
- `bedrockHeader`: `undefined`

## `ThreeStructureRendererOptions`

Supported fields:

- `chunkSize?: number | [number, number, number]`
- `useInvisibleBlockBuffer?: boolean`
- `drawDistance?: number`
- `debug?: boolean`
- `preserveDrawingBuffer?: boolean`
- `antialias?: boolean`
- `sunlight?: SunlightOptions`
- `asyncBuild?: boolean`
- `asyncChunkBuildTimeMs?: number`

Defaults:

- `chunkSize`: `16`
- `useInvisibleBlockBuffer`: `false`
- `debug`: `false`
- `preserveDrawingBuffer`: `false`
- `antialias`: `true`
- `asyncBuild`: `false`
- `asyncChunkBuildTimeMs`: `8`
- `drawDistance`: omitted
- `sunlight`: Lodestone default sunlight settings

No other fields are read.

## `ThreeStructureCameraOptions`

Supported fields:

- `position?: vec3 | [number, number, number]`
- `target?: vec3 | [number, number, number]`
- `up?: vec3 | [number, number, number]`
- `fov?: number`

No other fields are read.

## `ThreeStructureCameraState`

Fields:

- `position: vec3`
- `target: vec3`
- `up: vec3`
- `fov: number`

## `DefaultPackUrls`

Fields:

- `baseUrl: string`
- `assetsJson: string`
- `atlasPng: string`
- `blockFlags.opaqueTxt: string`
- `blockFlags.transparentTxt: string`
- `blockFlags.nonSelfCullingTxt: string`
- `blockFlags.emissiveJson: string`

## `loadDefaultPackResources(options)`

Supported fields:

- `baseUrl?: string | URL`
- `fetch?: typeof globalThis.fetch`

No other fields are read.

## `createResourcesFromPack(input)`

Supported fields:

- `assets.blockstates: Record<string, unknown>`
- `assets.models: Record<string, unknown>`
- `assets.textures: Record<string, [number, number, number, number]>`
- `atlas.imageData: ImageData`
- `atlas.atlasSize: number`
- `flags.opaque?: Set<string>`
- `flags.transparent?: Set<string>`
- `flags.nonSelfCulling?: Set<string>`
- `flags.emissive?: Record<string, { intensity?: number, conditional?: string }>`

No other fields are read.
