# Rendering

These docs describe Lodestone `0.6.0`.

## Imports

```ts
import { ThreeStructureRenderer, loadDefaultPackResources } from '@mattzh72/lodestone'
```

`ThreeStructureRenderer` renders a `StructureProvider` with Three.js.

## Constructor

```ts
const renderer = new ThreeStructureRenderer(canvas, structure, resources, options)
```

Supported fields:

- `canvas: HTMLCanvasElement`
- `structure: StructureProvider`
  - Must expose `getSize()`, `getBlocks()`, and `getBlock(pos)`.
- `resources: Resources`
  - Usually from `loadDefaultPackResources()`.
- `options?: ThreeStructureRendererOptions`

Supported `ThreeStructureRendererOptions` fields:

- `chunkSize?: number | [number, number, number]`
  - Defaults to `16`.
- `useInvisibleBlockBuffer?: boolean`
  - Defaults to `false`.
- `drawDistance?: number`
  - Optional max distance for visible chunk meshes.
- `debug?: boolean`
  - Defaults to `false`.
- `preserveDrawingBuffer?: boolean`
  - Passed to Three.js `WebGLRenderer`.
  - Defaults to `false`.
- `antialias?: boolean`
  - Passed to Three.js `WebGLRenderer`.
  - Defaults to `true`.
- `sunlight?: SunlightOptions`
  - Partial sunlight/rendering settings.
- `asyncBuild?: boolean`
  - Defaults to `false`.
- `asyncChunkBuildTimeMs?: number`
  - Defaults to `8`.

Unsupported:

- Rendering without WebGL.
- Automatic orbit controls. Applications should provide their own controls and call camera APIs.
- Server-side PNG rendering without a compatible canvas/WebGL environment.

## Viewport

### `setViewport(x, y, width, height, pixelRatio?)`

Supported fields:

- `x: number`
- `y: number`
- `width: number`
- `height: number`
- `pixelRatio?: number`
  - Defaults to `1`.

Behavior:

- Updates renderer pixel ratio and size.
- Updates viewport.
- Updates camera aspect ratio.
- Resizes post-processing targets.

Call this when the canvas size changes.

## Camera API

### `setFOV(fov)`

Sets the perspective camera field of view.

Supported fields:

- `fov: number`

Validation:

- Lodestone does not clamp or validate `fov`.

### `setCamera(options)`

Supported fields:

- `options.position?: vec3 | [number, number, number]`
- `options.target?: vec3 | [number, number, number]`
- `options.up?: vec3 | [number, number, number]`
- `options.fov?: number`

Return value:

- `this`

Behavior:

- Updates Lodestone's stored camera state.
- Recomputes the stored view matrix.
- Calls `setFOV` when `fov` is provided.

### `getCamera()`

Return value:

```ts
{
  position: vec3,
  target: vec3,
  up: vec3,
  fov: number,
}
```

Behavior:

- Returns cloned vectors. Mutating the returned vectors does not update the renderer.

### `getViewMatrix()`

Returns a cloned `mat4` view matrix for the stored camera.

### `lookAt(position, target, up?)`

Convenience wrapper for `setCamera({ position, target, up })`.

### `setCameraPosition(position)`

Updates only stored camera position.

### `setCameraTarget(target)`

Updates only stored camera target.

### `resetCamera()`

Sets a default camera based on the current structure size.

Behavior:

- Position is centered on `x/z`, raised above the target, and offset in positive `z`.
- Target is the structure center.
- Up vector is `[0, 1, 0]`.

## Structure Updates

### `setStructure(structure)`

Supported fields:

- `structure: StructureProvider`

Behavior:

- Replaces the rendered structure.
- Recomputes the target center.
- Updates stored camera target to the new target center.
- Rebuilds chunk meshes and overlays.

### `updateStructureBuffers(chunkPositions?)`

Supported fields:

- `chunkPositions?: vec3[]`

Behavior:

- Rebuilds all or selected chunk buffers.
- Use after mutating a structure that is already attached to the renderer.

### `updateStructureBuffersAsync(chunkPositions?)`

Async variant used for asynchronous chunk rebuilds.

### `whenReady()`

Returns the pending async build promise, or a resolved promise.

## Draw Methods

### `drawStructure(viewMatrix?)`

Supported fields:

- `viewMatrix?: mat4`
  - Defaults to the renderer's stored camera view matrix.

Behavior:

- Prepares the camera from the view matrix.
- Renders shadows, sky, structure, sunlight, and optional post-processing.

### `drawColoredStructure(viewMatrix?)`

Renders the structure with the colored debug material.

### `drawGrid(viewMatrix?)`

Renders the grid overlay if available.

### `drawInvisibleBlocks(viewMatrix?)`

Renders invisible block overlay when `useInvisibleBlocks` is enabled.

### `drawOutline(viewMatrix, pos)` or `drawOutline(pos)`

Supported fields:

- `viewMatrix?: mat4`
- `pos: vec3`

Behavior:

- Renders an outline at `pos`.
- Uses stored camera view matrix when called with only `pos`.

## Disposal

### `dispose()`

Disposes renderer-owned resources and cancels pending async builds.

Call this when permanently destroying the renderer.

## Minimal Render Loop

```ts
const { resources } = await loadDefaultPackResources()
const renderer = new ThreeStructureRenderer(canvas, structure, resources)

function frame() {
  renderer.setViewport(0, 0, canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio)
  renderer.lookAt([8, 6, 10], [4, 2, 4])
  renderer.drawStructure()
  requestAnimationFrame(frame)
}

frame()
```

Unsupported:

- Lodestone does not include user-input controls. Use pointer/mouse/touch code in your app.
- Lodestone does not currently expose a high-level screenshot API. Use the canvas or `preserveDrawingBuffer` if needed.
