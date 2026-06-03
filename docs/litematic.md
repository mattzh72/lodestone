# Litematic Loading

These docs describe Lodestone `0.6.0`.

## Import

```ts
import { LitematicLoader } from '@mattzh72/lodestone'
```

`LitematicLoader` loads Litematica `.litematic` schematic files into Lodestone `Structure` objects.

## Supported Format

Supported:

- Gzip-compressed Litematic NBT.
- Root fields commonly used by Litematica:
  - `MinecraftDataVersion`
  - `Version`
  - `Metadata`
  - `Regions`
  - `SubVersion`
- Region fields:
  - `Size`
  - `Position`
  - `BlockStatePalette`
  - `BlockStates`
- Packed block-state arrays with variable bit width.

Unsupported:

- Loading multiple regions into one combined structure.
- Preserving region offsets in output structure coordinates.
- Litematic export.
- Entity and block entity preservation from Litematic.
- Material lists or placement metadata beyond `getMetadata`.

## `LitematicLoader.load(buffer, regionName?)`

Loads a `.litematic` file from bytes.

Supported fields:

- `buffer: Uint8Array`
  - Gzip-compressed Litematic file data.
- `regionName?: string`
  - Optional region name.
  - When omitted, loads the first region.

Return value:

- `Structure`

Validation:

- Throws if NBT cannot be read as gzip.
- Throws if `regionName` is provided and the region is missing.
- Throws if no regions exist.

Behavior:

- Converts palette entries to `BlockState`.
- Skips `minecraft:air` blocks.
- Uses absolute value of region `Size` components.
- Ignores region `Position` offsets.
- Places blocks in structure-local coordinates starting at `[0, 0, 0]`.

## `LitematicLoader.fromNbt(root, regionName?)`

Loads from an already parsed Litematic root compound.

Supported fields:

- `root: NbtCompound`
- `regionName?: string`

Return value:

- `Structure`

Same region behavior and unsupported behavior as `load`.

## `LitematicLoader.getMetadata(buffer)`

Reads metadata from a `.litematic` file.

Supported fields:

- `buffer: Uint8Array`

Return value:

```ts
{
  name: string,
  author: string,
  description: string,
  totalBlocks: number,
  totalVolume: number,
  regionCount: number,
  size: {
    x: number,
    y: number,
    z: number,
  },
}
```

Defaults:

- `name`: `''` from missing string getter behavior, despite docs commonly treating absent names as unnamed.
- `author`: `''` from missing string getter behavior.
- `description`: `''`
- numeric fields: `0`

Unsupported:

- Returning full raw metadata.
- Returning per-region metadata.
- Validating metadata fields against Litematica versions.

## Example

```ts
import { LitematicLoader } from '@mattzh72/lodestone'
import fs from 'node:fs/promises'

const bytes = new Uint8Array(await fs.readFile('build.litematic'))
const metadata = LitematicLoader.getMetadata(bytes)
const structure = LitematicLoader.load(bytes)

console.log(metadata.name, structure.getSize())
```
