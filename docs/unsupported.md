# Unsupported Behavior

These docs describe Lodestone `0.6.0`.

This file lists behavior that Lodestone does not currently implement. Use it to avoid inventing unsupported features.

## Minecraft Simulation

Unsupported:

- Full game physics.
- Gravity updates.
- Falling blocks.
- Fluid simulation.
- Random ticks.
- Crop growth.
- Redstone simulation.
- Command block execution.
- Mob/entity simulation.
- Item drops.
- Explosion simulation.
- Biome simulation.
- Light propagation simulation.
- Weather or time simulation.

## Block State Validation

Unsupported:

- Checking whether a block id exists in a Minecraft version.
- Checking whether a property exists for a block id.
- Checking whether a property value is valid.
- Automatically adding required properties except the supported `updateBlockStates()` connector fields.
- Minecraft data fixer upgrades/downgrades.

## `updateBlockStates()` Coverage

Supported only:

- Horizontal pane/iron-bar connections.
- Horizontal fence connections.
- Missing connector `waterlogged` defaults to `'false'`.

Unsupported:

- Wall low/tall/up states.
- Stair shapes.
- Fence gate connections.
- Redstone wire connections.
- Rail shapes.
- Door and trapdoor halves/open states.
- Lantern hanging validation.
- Torch/wall-torch placement validation.
- Waterlogging detection from nearby fluids.

## Structure Export

Unsupported:

- Multiple regions.
- World/chunk writing.
- Structure entities.
- Automatic block entity schema validation.
- Automatic block entity ids.
- Schematica or Sponge schematic export.
- Litematic export.

Supported alternative:

- Vanilla Java structure `.nbt` via `Structure.writeNbt`.

## Structure Import

Unsupported:

- Full world loading.
- Schematica/Sponge formats.
- Multi-region Litematic merge.

Supported:

- Vanilla structure NBT via `Structure.fromNbt`.
- Litematic first-region load via `LitematicLoader`.

## Rendering

Unsupported:

- Rendering without WebGL.
- Built-in orbit/pan/zoom controls.
- Built-in screenshot API.
- Entity rendering.
- Full block entity visual rendering for every block entity.
- Custom zipped resource-pack loading.
- Multi-pack merging.
- Shader compatibility guarantees outside supported browser/WebGL environments.

## NBT

Unsupported:

- Schema validation for Minecraft files.
- Automatic SNBT escaping for every edge case.
- Data fixer transformations.
- NBT path query language.

## Runtime

Unsupported:

- CommonJS `require`.
- Non-ESM package usage.
- Running renderer code in Node without compatible canvas/WebGL/browser APIs.
