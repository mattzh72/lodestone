# NBT

These docs describe Lodestone `0.6.0`.

## Imports

```ts
import {
  NbtFile,
  NbtCompound,
  NbtList,
  NbtByte,
  NbtShort,
  NbtInt,
  NbtLong,
  NbtFloat,
  NbtDouble,
  NbtString,
  NbtByteArray,
  NbtIntArray,
  NbtLongArray,
  NbtType,
} from '@mattzh72/lodestone'
```

## Compression Modes

Supported `NbtCompressionMode` values:

- `'gzip'`
- `'zlib'`
- `'none'`

## `NbtFile`

### `new NbtFile(name, root, compression, littleEndian, bedrockHeader)`

Supported fields:

- `name: string`
- `root: NbtCompound`
- `compression: 'gzip' | 'zlib' | 'none'`
- `littleEndian: boolean`
- `bedrockHeader: number | undefined`

Most callers should use `NbtFile.create`, `NbtFile.read`, or `Structure.writeNbt`.

### `NbtFile.create(options?)`

Supported fields:

- `options.name?: string`
  - Defaults to `''`.
- `options.compression?: 'gzip' | 'zlib' | 'none'`
  - Defaults to `'none'`.
- `options.littleEndian?: boolean`
  - Defaults to `false`, unless `bedrockHeader` is set.
- `options.bedrockHeader?: number | boolean`
  - `true` uses default Bedrock header version `4`.
  - `number` writes that version.

Return value:

- `NbtFile` with empty `NbtCompound` root.

### `NbtFile.read(array, options?)`

Supported fields:

- `array: Uint8Array`
- `options.compression?: 'gzip' | 'zlib' | 'none'`
  - If omitted, gzip/zlib are detected from headers for Java-style NBT.
- `options.littleEndian?: boolean`
- `options.bedrockHeader?: number | boolean`
  - Enables Bedrock header handling and little-endian reading.
- `options.name?: string`
  - Optional override for the returned file name.

Return value:

- `NbtFile`

Validation:

- Throws if the top tag is not a compound.
- Throws if compressed input cannot be inflated.

### `write()`

Returns `Uint8Array` bytes using the file's compression/endian/header settings.

### `toJson()` and `NbtFile.fromJson(value)`

Round-trip Lodestone's JSON representation, not Mojang's SNBT string format.

## `NbtCompound`

Map-like tag keyed by strings.

### Constructor and Creation

```ts
const tag = new NbtCompound()
const tag2 = NbtCompound.create()
const tag3 = new NbtCompound(new Map([['id', new NbtString('minecraft:chest')]]))
```

Supported fields:

- `properties?: Map<string, NbtTag>`

### Read Methods

- `has(key): boolean`
- `hasNumber(key): boolean`
- `hasString(key): boolean`
- `hasList(key, type?, length?): boolean`
- `hasCompound(key): boolean`
- `get(key): NbtTag | undefined`
- `getString(key): string`
- `getNumber(key): number`
- `getBoolean(key): boolean`
- `getList(key, type?): NbtList`
- `getCompound(key): NbtCompound`
- `getByteArray(key): NbtByteArray`
- `getIntArray(key): NbtIntArray`
- `getLongArray(key): NbtLongArray`
- `keys(): IterableIterator<string>`
- `size: number`

Default read behavior:

- `getString` returns `''` when missing or not string-like.
- `getNumber` returns `0` when missing or not numeric.
- `getBoolean` returns `getNumber(key) !== 0`.
- `getList` returns an empty list when missing or wrong type.
- `getCompound` returns an empty compound when missing or wrong type.
- Array getters return empty arrays when missing or wrong type.

### Mutation Methods

- `set(key, value): this`
- `delete(key): boolean`
- `clear(): this`

Supported fields:

- `key: string`
- `value: NbtTag`

Unsupported:

- Setting plain JS values directly. Use explicit `NbtTag` instances.

### Iteration and Mapping

- `map(fn): Record<string, U>`
- `forEach(fn): void`

### String and JSON

- `toString()` returns compact SNBT-like text.
- `toPrettyString(indent?, depth?)` returns formatted text.
- `toSimplifiedJson()` returns plain values where possible.
- `toJson()` returns typed Lodestone JSON.
- `NbtCompound.fromString(reader)` parses an SNBT-like tag through `NbtParser`.
- `NbtCompound.fromJson(value)` reads typed Lodestone JSON.

## `NbtList`

Homogeneous list tag.

### Constructor and Creation

```ts
const list = new NbtList([new NbtInt(1), new NbtInt(2)])
const empty = NbtList.create()
const strings = NbtList.make(NbtString, ['a', 'b'])
```

Supported fields:

- `items?: NbtTag[]`
- `type?: number`

Behavior:

- Empty lists use `NbtType.End`.
- Non-empty lists infer their type from the first item unless `type` is supplied.
- Adding/inserting a tag of a different type throws.

### Read Methods

- `getType(): number`
- `getNumber(index): number`
- `getString(index): string`
- `getList(index, type): NbtList`
- `getCompound(index): NbtCompound`
- inherited list-like methods from `NbtAbstractList`, including indexed access and mapping.

Default read behavior:

- `getNumber` returns `0` for missing or non-number entries.
- `getString` returns `''` for missing or non-string entries.
- `getList` returns empty list when missing or wrong type.
- `getCompound` returns empty compound when missing or wrong type.

### Mutation Methods

- `set(index, tag)`
- `add(tag)`
- `insert(index, tag)`
- `clear()`

Validation:

- Mixed tag types are not allowed.
- `NbtType.End` does not update list type.

## Scalar Tags

Supported constructors:

- `new NbtByte(value: number)`
- `new NbtShort(value: number)`
- `new NbtInt(value: number)`
- `new NbtLong(value: bigint | number)`
- `new NbtFloat(value: number)`
- `new NbtDouble(value: number)`
- `new NbtString(value: string)`

Behavior:

- Numeric tags expose numeric conversions through base `NbtTag` methods.
- `NbtLong` supports values that may exceed JavaScript safe integer range depending on constructor input and use.

## Array Tags

Supported array tags:

- `NbtByteArray`
- `NbtIntArray`
- `NbtLongArray`

Use these for Mojang NBT array fields, not regular JS arrays.

## Common Block Entity Example

```ts
const chestNbt = new NbtCompound()
  .set('id', new NbtString('minecraft:chest'))
  .set('CustomName', new NbtString('{"text":"Loot"}'))

structure.addBlock([1, 1, 1], 'minecraft:chest', { facing: 'north' }, chestNbt)
```

Supported:

- Any keys and tag values can be written.

Unsupported:

- Lodestone does not validate block entity schemas.
- Lodestone does not guarantee the block entity will be accepted by every Minecraft version.
