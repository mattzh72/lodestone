import { mat4, vec3 } from 'gl-matrix'
import type { BlockState, Identifier, PlacedBlock, Resources, StructureProvider } from '../index.js'
import { BlockPos, Direction, Vector } from '../index.js'
import { Mesh } from './Mesh.js'
import { SpecialRenderers } from './SpecialRenderer.js'

type Chunk = { mesh: Mesh, transparentMesh: Mesh, origin: vec3 }
type ChunkEntry = { mesh: Mesh, origin: vec3, transparent: boolean }
export type EmissiveLight = { position: vec3, intensity: number, color: [number, number, number] }

export class ChunkBuilder {
	private chunks: (Chunk | null)[][][] = []
	private readonly chunkSize: vec3
	private meshesDirty = true
	private meshCache: ChunkEntry[] = []
	private emissiveLights: EmissiveLight[] = []
	private emissiveLightsByChunk = new Map<string, EmissiveLight[]>()
	private emissiveDirty = true
	private readonly blockPropsCache = new WeakMap<BlockState, Record<string, string>>()
	private buildToken = 0

	constructor(
		private readonly gl: WebGLRenderingContext,
		private structure: StructureProvider,
		private readonly resources: Resources,
		chunkSize: number | vec3 = 16,
		buildOnInit: boolean = true
	) {
		this.chunkSize = typeof chunkSize === 'number' ? [chunkSize, chunkSize, chunkSize] : chunkSize
		if (buildOnInit) {
			this.updateStructureBuffers()
		}
	}

	public setStructure(structure: StructureProvider, options?: { rebuild?: boolean }) {
		this.structure = structure
		if (options?.rebuild === false) return
		this.updateStructureBuffers()
	}

	public updateStructureBuffers(chunkPositions?: vec3[]): void {
		if (!this.structure)
			return
		this.buildToken += 1
		const chunkFilter = this.buildChunkFilter(chunkPositions)
		this.markDirty()
		this.prepareRebuild(chunkPositions)
		for (const block of this.structure.getBlocks()) {
			this.processBlock(block, chunkFilter)
		}
		this.finalizeRebuild(chunkPositions)
	}

	public async updateStructureBuffersAsync(options?: { chunkPositions?: vec3[], timeSliceMs?: number, onProgress?: (completed: number, total: number) => void }) {
		if (!this.structure)
			return
		const token = ++this.buildToken
		const chunkFilter = this.buildChunkFilter(options?.chunkPositions)
		this.markDirty()
		this.prepareRebuild(options?.chunkPositions)

		const blocks = this.structure.getBlocks()
		const total = blocks.length
		const timeSliceMs = options?.timeSliceMs ?? 8
		let lastYield = this.now()

		for (let i = 0; i < blocks.length; i++) {
			if (token !== this.buildToken) return
			this.processBlock(blocks[i], chunkFilter)
			if ((i & 0x3ff) === 0 && this.now() - lastYield >= timeSliceMs) {
				options?.onProgress?.(i + 1, total)
				await this.yieldControl()
				lastYield = this.now()
			}
		}

		if (token !== this.buildToken) return
		await this.finalizeRebuildAsync(options?.chunkPositions, timeSliceMs)
		options?.onProgress?.(total, total)
	}

	public getMeshes(): Mesh[] {
		return this.getMeshEntries().map(entry => entry.mesh)
	}

	public cancelPendingBuilds() {
		this.buildToken += 1
	}

	public getMeshesInRange(cameraPos: vec3, maxDistance?: number): Mesh[] {
		return this.getMeshEntriesInRange(cameraPos, maxDistance).map(entry => entry.mesh)
	}

	public getMeshEntries(): ChunkEntry[] {
		if (this.meshesDirty || this.meshCache.length === 0) {
			this.rebuildMeshCache()
		}
		return this.meshCache
	}

	public getMeshEntriesInRange(cameraPos: vec3, maxDistance?: number): ChunkEntry[] {
		if (this.meshesDirty || this.meshCache.length === 0) {
			this.rebuildMeshCache()
		}
		if (maxDistance === undefined) {
			return this.meshCache
		}

		const maxDistanceSq = maxDistance * maxDistance
		const filtered = this.meshCache.filter(entry => {
			const center: vec3 = [
				entry.origin[0] + this.chunkSize[0] * 0.5,
				entry.origin[1] + this.chunkSize[1] * 0.5,
				entry.origin[2] + this.chunkSize[2] * 0.5,
			]
			const dx = center[0] - cameraPos[0]
			const dy = center[1] - cameraPos[1]
			const dz = center[2] - cameraPos[2]
			return dx*dx + dy*dy + dz*dz <= maxDistanceSq
		})
		return filtered
	}

	private needsCull(block: PlacedBlock, dir: Direction) {
		const neighbor = this.structure.getBlock(BlockPos.towards(block.pos, dir))?.state
		if (!neighbor) return false
		const neighborFlags = this.resources.getBlockFlags(neighbor.getName())

		if (block.state.getName().equals(neighbor.getName()) && neighborFlags?.self_culling){
			return true
		}
		
		if (neighborFlags?.opaque) {
			return !(dir === Direction.UP && block.state.isWaterlogged())
		} else {
			return block.state.isWaterlogged() && neighbor.isWaterlogged()
		}
	}

	private isFullyOccluded(block: PlacedBlock): boolean {
		const dirs = [Direction.UP, Direction.DOWN, Direction.NORTH, Direction.SOUTH, Direction.EAST, Direction.WEST]
		for (const dir of dirs) {
			const neighbor = this.structure.getBlock(BlockPos.towards(block.pos, dir))?.state
			if (!neighbor) {
				return false
			}
			const flags = this.resources.getBlockFlags(neighbor.getName())
			if (!flags?.opaque) {
				return false
			}
		}
		return true
	}

	private finishChunkMesh(mesh: Mesh, pos: vec3, blockName: Identifier, blockProps: Record<string, string>, chunkKey: string) {
		const t = mat4.create()
		mat4.translate(t, t, pos)
		mesh.transform(t)

		// Determine emissive value based on block flags
		const flags = this.resources.getBlockFlags(blockName)
		let emissive = 0
		if (flags?.emissive) {
			// Check for conditional emission (e.g., lit property)
			const conditional = flags.emissiveConditional
			if (conditional) {
				const propValue = blockProps[conditional]
				// Only emit if the conditional property is true or not specified
				if (propValue === undefined || propValue === 'true') {
					emissive = flags.emissiveIntensity ?? 1.0
				}
			} else {
				emissive = flags.emissiveIntensity ?? 1.0
			}
		}

		// Collect emissive blocks as point lights
		if (emissive > 0) {
			// Place light at center of block
			const lights = this.emissiveLightsByChunk.get(chunkKey) ?? []
			lights.push({
				position: [pos[0] + 0.5, pos[1] + 0.5, pos[2] + 0.5],
				intensity: emissive,
				color: [1.0, 0.85, 0.6], // Warm light color
			})
			this.emissiveLightsByChunk.set(chunkKey, lights)
			this.emissiveDirty = true
		}

		for (const q of mesh.quads) {
			const normal = q.normal()
			q.forEach(v => {
				v.normal = normal
				v.blockPos = new Vector(pos[0], pos[1], pos[2])
				v.emissive = emissive
			})
		}
	}

	public getEmissiveLights(): EmissiveLight[] {
		if (this.emissiveDirty) {
			const lights: EmissiveLight[] = []
			this.emissiveLightsByChunk.forEach(chunkLights => lights.push(...chunkLights))
			this.emissiveLights = lights
			this.emissiveDirty = false
		}
		return this.emissiveLights
	}

	private clearEmissiveLights(chunkPos: vec3) {
		const key = this.chunkKey(chunkPos)
		if (this.emissiveLightsByChunk.has(key)) {
			this.emissiveLightsByChunk.delete(key)
			this.emissiveDirty = true
		}
	}

	private prepareRebuild(chunkPositions?: vec3[]) {
		// Clear emissive lights when doing full rebuild
		if (!chunkPositions) {
			this.emissiveLightsByChunk.clear()
			this.emissiveLights = []
			this.emissiveDirty = true
			this.chunks.forEach(x => x.forEach(y => y.forEach(chunk => {
				if (!chunk) return
				chunk.mesh.clear()
				chunk.transparentMesh.clear()
			})))
			return
		}

		chunkPositions.forEach(chunkPos => this.clearEmissiveLights(chunkPos))
		chunkPositions.forEach(chunkPos => {
			const chunk = this.getChunk(chunkPos)
			chunk.mesh.clear()
			chunk.transparentMesh.clear()
		})
	}

	private finalizeRebuild(chunkPositions?: vec3[]) {
		if (!chunkPositions) {
			this.chunks.forEach(x => x.forEach(y => y.forEach(chunk => {
				if (!chunk) return
				chunk.mesh.rebuild(this.gl, { pos: true, color: true, texture: true, normal: true, blockPos: true, usage: this.gl.STATIC_DRAW })
				chunk.transparentMesh.rebuild(this.gl, { pos: true, color: true, texture: true, normal: true, blockPos: true, usage: this.gl.STATIC_DRAW })
			})))
			return
		}

		chunkPositions.forEach(chunkPos => {
			const chunk = this.getChunk(chunkPos)
			chunk.mesh.rebuild(this.gl, { pos: true, color: true, texture: true, normal: true, blockPos: true, usage: this.gl.STATIC_DRAW })
			chunk.transparentMesh.rebuild(this.gl, { pos: true, color: true, texture: true, normal: true, blockPos: true, usage: this.gl.STATIC_DRAW })
		})
	}

	private async finalizeRebuildAsync(chunkPositions?: vec3[], timeSliceMs: number = 8) {
		let lastYield = this.now()
		const maybeYield = async () => {
			if (this.now() - lastYield >= timeSliceMs) {
				await this.yieldControl()
				lastYield = this.now()
			}
		}

		if (!chunkPositions) {
			for (const x of this.chunks) {
				if (!x) continue
				for (const y of x) {
					if (!y) continue
					for (const chunk of y) {
						if (!chunk) continue
						chunk.mesh.rebuild(this.gl, { pos: true, color: true, texture: true, normal: true, blockPos: true, usage: this.gl.STATIC_DRAW })
						chunk.transparentMesh.rebuild(this.gl, { pos: true, color: true, texture: true, normal: true, blockPos: true, usage: this.gl.STATIC_DRAW })
						await maybeYield()
					}
				}
			}
			return
		}

		for (const chunkPos of chunkPositions) {
			const chunk = this.getChunk(chunkPos)
			chunk.mesh.rebuild(this.gl, { pos: true, color: true, texture: true, normal: true, blockPos: true, usage: this.gl.STATIC_DRAW })
			chunk.transparentMesh.rebuild(this.gl, { pos: true, color: true, texture: true, normal: true, blockPos: true, usage: this.gl.STATIC_DRAW })
			await maybeYield()
		}
	}

	private processBlock(block: PlacedBlock, chunkFilter: Set<string> | null) {
		const blockName = block.state.getName()
		const blockProps = this.getBlockProps(block.state)

		if (this.isFullyOccluded(block)) {
			return
		}

		const chunkPos: vec3 = [
			Math.floor(block.pos[0] / this.chunkSize[0]),
			Math.floor(block.pos[1] / this.chunkSize[1]),
			Math.floor(block.pos[2] / this.chunkSize[2]),
		]

		const chunkKey = this.chunkKey(chunkPos)
		if (chunkFilter && !chunkFilter.has(chunkKey)) return

		const chunk = this.getChunk(chunkPos)

		try {
			const blockDefinition = this.resources.getBlockDefinition(blockName)
			const cull = {
				up: this.needsCull(block, Direction.UP),
				down: this.needsCull(block, Direction.DOWN),
				west: this.needsCull(block, Direction.WEST),
				east: this.needsCull(block, Direction.EAST),
				north: this.needsCull(block, Direction.NORTH),
				south: this.needsCull(block, Direction.SOUTH),
			}
			const mesh = new Mesh()
			if (blockDefinition) {
				mesh.merge(blockDefinition.getMesh(blockName, blockProps, this.resources, this.resources, cull))
			}
			const specialMesh = SpecialRenderers.getBlockMesh(block.state, block.nbt, this.resources, cull)
			if (!specialMesh.isEmpty()) {
				mesh.merge(specialMesh)
			}
			if (!mesh.isEmpty()) {
				this.finishChunkMesh(mesh, block.pos, blockName, blockProps, chunkKey)
				if (this.resources.getBlockFlags(block.state.getName())?.semi_transparent){
					chunk.transparentMesh.merge(mesh)
				} else {
					chunk.mesh.merge(mesh)
				}
			}
		} catch (e) {
			console.error(`Error rendering block ${blockName}`, e)
		}
	}

	private getBlockProps(state: BlockState) {
		const cached = this.blockPropsCache.get(state)
		if (cached) return cached
		const props = state.getProperties()
		const defaultProps = this.resources.getDefaultBlockProperties(state.getName()) ?? {}
		Object.entries(defaultProps).forEach(([k, v]) => {
			if (!props[k]) props[k] = v
		})
		this.blockPropsCache.set(state, props)
		return props
	}

	private buildChunkFilter(chunkPositions?: vec3[]) {
		if (!chunkPositions) return null
		const keys = new Set<string>()
		chunkPositions.forEach(chunkPos => {
			keys.add(this.chunkKey(chunkPos))
		})
		return keys
	}

	private now() {
		return typeof performance !== 'undefined' ? performance.now() : Date.now()
	}

	private async yieldControl() {
		const requestIdle = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
		if (requestIdle) {
			await new Promise<void>(resolve => requestIdle(resolve))
			return
		}
		await new Promise<void>(resolve => setTimeout(resolve, 0))
	}

	private chunkKey(chunkPos: vec3) {
		return `${chunkPos[0]},${chunkPos[1]},${chunkPos[2]}`
	}

	private getChunk(chunkPos: vec3): Chunk {
		const x = Math.abs(chunkPos[0]) * 2 + (chunkPos[0] < 0 ? 1 : 0)
		const y = Math.abs(chunkPos[1]) * 2 + (chunkPos[1] < 0 ? 1 : 0)
		const z = Math.abs(chunkPos[2]) * 2 + (chunkPos[2] < 0 ? 1 : 0)

		if (!this.chunks[x]) this.chunks[x] = []
		if (!this.chunks[x][y]) this.chunks[x][y] = []
		if (!this.chunks[x][y][z]) {
			const origin: vec3 = [
				chunkPos[0] * this.chunkSize[0],
				chunkPos[1] * this.chunkSize[1],
				chunkPos[2] * this.chunkSize[2],
			]
			this.chunks[x][y][z] = {mesh: new Mesh(), transparentMesh: new Mesh(), origin}
		}

		return this.chunks[x][y][z] as Chunk
	}

	private rebuildMeshCache() {
		const opaque: ChunkEntry[] = []
		const transparent: ChunkEntry[] = []

		this.chunks.forEach(x => x.forEach(y => y.forEach(chunk => {
			if (!chunk) return
			if (!chunk.mesh.isEmpty()) {
				opaque.push({ mesh: chunk.mesh, origin: chunk.origin, transparent: false })
			}
			if (!chunk.transparentMesh.isEmpty()) {
				transparent.push({ mesh: chunk.transparentMesh, origin: chunk.origin, transparent: true })
			}
		})))

		this.meshCache = opaque.concat(transparent)
		this.meshesDirty = false
	}

	private markDirty() {
		this.meshesDirty = true
		this.meshCache = []
	}
}
