# Lodestone Docs

These Markdown files are the public reference docs for Lodestone. They are written to be clear, searchable, and useful as a local source of truth.

Use `rg` to search by class, method, field, block-state property, or unsupported behavior.

## Files

- `getting-started.md` - installation, imports, minimal structure export, and minimal render loop.
- `structure.md` - `Structure`, `BlockState`, coordinates, palettes, NBT export, and block-state updates.
- `nbt.md` - `NbtFile`, `NbtCompound`, `NbtList`, scalar tags, arrays, JSON, and SNBT parsing.
- `rendering.md` - `ThreeStructureRenderer`, camera APIs, render methods, and supported renderer options.
- `resources.md` - default resource pack helpers and the `Resources` interface.
- `default-pack-block-states.md` - generated default-pack block ids, rendered block-state values, special renderer state values, and generic renderer properties.
- `litematic.md` - Litematic import and metadata support.
- `supported-fields.md` - supported option fields, object fields, defaults, and CLI-relevant contracts.
- `unsupported.md` - explicit non-goals and behavior Lodestone does not currently implement.
- `examples.md` - complete examples for common tasks.

## Version

These docs describe Lodestone `0.6.0`.

When adding public APIs, update the relevant docs in this directory and keep `supported-fields.md` current. When changing `assets/default-pack/assets.json` or special renderer state handling, run `npm run docs:block-states`.
