# Structures and Block States

These docs describe Lodestone `0.6.0`.

## Coordinate Model

Lodestone structures are finite cuboids. Coordinates are integer `[x, y, z]` tuples:

- `x`: east-west axis.
- `y`: vertical axis.
- `z`: north-south axis.

Supported:

- Integer coordinates inside structure bounds.
- Positive integer structure sizes.
- Sparse structures: only placed blocks are stored.

Unsupported:

- Negative coordinates inside a single `Structure`.
- Infinite or unbounded worlds.
- Multiple regions inside one `Structure`.
- Automatic chunk/world placement.

## `Structure`

Import:

```ts
import { Structure } from '@mattzh72/lodestone'
```

### `new Structure(size, palette?, blocks?)`

Creates a finite structure.

Supported fields:

- `size: [number, number, number]`
  - Required.
  - Interpreted as `[x, y, z]`.
  - Expected to contain positive integer dimensions.
- `palette?: BlockState[]`
  - Optional advanced constructor input.
  - Used when constructing from existing palette/block arrays.
- `blocks?: { pos: [number, number, number], state: number, nbt?: NbtCompound }[]`
  - Optional advanced constructor input.
  - `state` indexes into `palette`.

Validation:

- Constructor throws if any provided stored block is outside bounds.
- Constructor does not validate that size values are positive integers.

Prefer `new Structure(size)` plus `addBlock` for programmatic builds.

### `Structure.EMPTY`

Static empty structure with size `[0, 0, 0]`.

### `getSize()`

Returns the structure size tuple.

Return value:

- `[number, number, number]`

Mutation behavior:

- The returned tuple is the structure's internal size object. Treat it as read-only.

### `isInside(pos)`

Returns whether a position is inside bounds.

Supported fields:

- `pos: [number, number, number]`

Return value:

- `boolean`

Inside means:

- `0 <= x < size[0]`
- `0 <= y < size[1]`
- `0 <= z < size[2]`

### `addBlock(pos, name, properties?, nbt?)`

Adds or replaces a block.

Supported fields:

- `pos: [number, number, number]`
  - Must be inside structure bounds.
- `name: string | Identifier`
  - Block id, such as `minecraft:stone` or `stone`.
  - Missing namespace defaults to `minecraft`.
- `properties?: Record<string, string>`
  - Optional block-state properties.
  - Values must be strings.
- `nbt?: NbtCompound`
  - Optional block entity data.

Return value:

- `this`

Mutation behavior:

- Mutates the structure.
- Replaces an existing block at `pos` if one exists.
- Adds new block states to the internal palette as needed.
- Clears placed block caches.

Validation:

- Throws if `pos` is outside structure bounds.
- Does not validate that `name` is a real Minecraft block id.
- Does not validate that `properties` are valid for the block id.
- Does not validate block entity schema.

Example:

```ts
structure.addBlock([1, 2, 3], 'minecraft:oak_stairs', {
  facing: 'east',
  half: 'bottom',
  shape: 'straight',
})
```

### `getBlock(pos)`

Gets a placed block at `pos`.

Supported fields:

- `pos: [number, number, number]`

Return value:

- `{ pos, state, nbt? } | null`

Behavior:

- Returns `null` if `pos` is outside bounds.
- Returns `null` if no block was placed at `pos`.
- Returned `state` is a `BlockState`.

### `getBlocks()`

Returns all placed blocks.

Return value:

- `{ pos, state, nbt? }[]`

Behavior:

- Only explicitly placed blocks are returned.
- Air is not implied or returned unless a recipe explicitly placed an air block.

### `clone()`

Creates a separate `Structure` with copied size, palette states, block positions, and block references.

Return value:

- `Structure`

Mutation behavior:

- Mutating the clone does not mutate the original structure.
- Block entity `NbtCompound` values are currently shared by reference.

### `updateBlockStates()`

Applies Lodestone-supported Minecraft-like block-state derivations to the structure.

Return value:

- `{ updatedBlocks: number }`

Mutation behavior:

- Mutates the structure.
- Idempotent for currently supported updates. Calling it again immediately should return `{ updatedBlocks: 0 }`.

Supported in `0.6.0`:

- Horizontal connection states for panes:
  - `minecraft:iron_bars`
  - block ids ending in `_glass_pane`
- Horizontal connection states for fences:
  - `minecraft:nether_brick_fence`
  - block ids ending in `_fence`, excluding `_fence_gate`
- Properties written:
  - `north: 'true' | 'false'`
  - `east: 'true' | 'false'`
  - `south: 'true' | 'false'`
  - `west: 'true' | 'false'`
  - `waterlogged: 'false'` only when absent

Pane connection behavior:

- Panes connect to neighboring pane-like blocks.
- Panes connect to neighboring full-side blocks.
- Panes do not connect to fences, fence gates, stairs, slabs, walls, torches, rails, signs, doors, trapdoors, or air-like/liquid blocks.

Fence connection behavior:

- Fences connect to neighboring fence-like blocks.
- Fences connect to neighboring full-side blocks.
- Fences do not connect to panes, fence gates, stairs, slabs, walls, torches, rails, signs, doors, trapdoors, or air-like/liquid blocks.

Unsupported in `0.6.0`:

- Wall `up`, `north`, `east`, `south`, `west` low/tall states.
- Stair shape derivation.
- Fence gate interactions.
- Redstone connections.
- Rails.
- Doors/trapdoors.
- Fluids beyond defaulting missing connector `waterlogged` to `'false'`.
- Version-specific block-state validation.

### `toNbt(options?)`

Serializes to vanilla Java structure NBT compound data.

Supported fields:

- `options.dataVersion?: number`
  - If provided, writes `DataVersion`.
- `options.updateBlockStates?: boolean`
  - Default `false`.
  - When `true`, clones the structure, calls `updateBlockStates()` on the clone, and serializes the clone.

Return value:

- `NbtCompound`

Mutation behavior:

- Does not mutate the source structure when `updateBlockStates: true`.

Generated root fields:

- `size: NbtList<NbtInt>`
- `palette: NbtList<NbtCompound>`
- `blocks: NbtList<NbtCompound>`
- `entities: NbtList`
- `DataVersion: NbtInt` only when supplied

Each block entry contains:

- `pos: NbtList<NbtInt>`
- `state: NbtInt`
- `nbt: NbtCompound` only when block entity data exists and is non-empty

Unsupported:

- Structure entities.
- Data fixer upgrades/downgrades.
- Automatic block entity ids.
- Automatic Minecraft version selection.

### `writeNbt(options?)`

Serializes to bytes.

Supported fields:

- `options.name?: string`
  - NBT file root name. Defaults to `''`.
- `options.compression?: 'gzip' | 'zlib' | 'none'`
  - Defaults to `'gzip'`.
- `options.dataVersion?: number`
- `options.updateBlockStates?: boolean`

Return value:

- `Uint8Array`

### `Structure.fromNbt(nbt)`

Creates a `Structure` from a vanilla structure NBT root compound.

Supported fields read:

- `size`
- `palette`
- `blocks`
- each block's optional `nbt`

Ignored fields:

- `entities`
- unknown root fields

Unsupported:

- Multiple structure regions.
- Schematica or Sponge schematic formats.
- Litematic format. Use `LitematicLoader` instead.

### `Structure.transform(pos, rotation, pivot)`

Transforms a position around a pivot using a `Rotation`.

Supported rotations:

- `Rotation.COUNTERCLOCKWISE_90`
- `Rotation.CLOCKWISE_90`
- `Rotation.CLOCKWISE_180`
- default/no rotation

Return value:

- `[number, number, number]`

## `BlockState`

Import:

```ts
import { BlockState } from '@mattzh72/lodestone'
```

### `new BlockState(name, properties?)`

Supported fields:

- `name: string | Identifier`
- `properties?: Record<string, string>`

Behavior:

- Missing namespace defaults to `minecraft`.
- Properties are stored as provided.

Unsupported:

- Minecraft registry validation.
- Version-specific property validation.
- Non-string property values.

### Static constants

- `BlockState.AIR`
- `BlockState.STONE`
- `BlockState.WATER` with `{ level: '0' }`
- `BlockState.LAVA` with `{ level: '0' }`

### `getName()`

Returns the `Identifier` block id.

### `getProperties()`

Returns the properties object.

Mutation behavior:

- The returned object is the internal properties object. Treat it as read-only.

### `getProperty(key)`

Returns one string property value or `undefined`.

### `is(other)`

Supported fields:

- `other: string | Identifier | BlockState`

Return value:

- `boolean`

Behavior:

- Compares block id only.
- Does not compare properties.

### `equals(other)`

Compares block id and all properties.

### `toString()`

Returns a canonical state string with sorted properties.

Examples:

- `minecraft:stone`
- `minecraft:oak_stairs[facing=east,half=bottom,shape=straight]`

### `BlockState.parse(str)`

Parses a block id or block-state string.

Supported examples:

- `minecraft:stone`
- `stone`
- `minecraft:oak_stairs[facing=east,half=bottom,shape=straight]`

Unsupported:

- Escaped commas or escaped equals signs inside property values.
- Validation that the property names/values exist for the block.

### `toNbt()`

Returns a `NbtCompound` with:

- `Name: NbtString`
- optional `Properties: NbtCompound` of `NbtString` values

### `BlockState.fromNbt(nbt)`

Reads:

- `Name`
- optional `Properties`

### `BlockState.fromJson(obj)`

Reads:

- `Name`
- optional `Properties`

Defaults:

- Missing `Name` defaults to `minecraft:stone`.
