import type { NbtCompressionMode } from '../nbt/index.js'
import { NbtCompound, NbtFile, NbtInt, NbtList, NbtType } from '../nbt/index.js'
import { BlockPos } from './BlockPos.js'
import { BlockState } from './BlockState.js'
import type { Identifier } from './Identifier.js'
import { Registry } from './Registry.js'
import { Rotation } from './Rotation.js'
import type { StructureProvider } from './StructureProvider.js'

type StoredBlock = { pos: BlockPos, state: number, nbt?: NbtCompound }
export type PlacedBlock = { pos: BlockPos, state: BlockState, nbt?: NbtCompound }

export interface StructureNbtOptions {
	dataVersion?: number
	updateBlockStates?: boolean
}

export interface StructureNbtWriteOptions extends StructureNbtOptions {
	name?: string
	compression?: NbtCompressionMode
}

export interface StructureBlockStateUpdateResult {
	updatedBlocks: number
}

const HORIZONTAL_DIRECTIONS: readonly { key: 'north' | 'east' | 'south' | 'west', offset: BlockPos }[] = [
	{ key: 'north', offset: [0, 0, -1] },
	{ key: 'east', offset: [1, 0, 0] },
	{ key: 'south', offset: [0, 0, 1] },
	{ key: 'west', offset: [-1, 0, 0] },
]

const AIR_LIKE_BLOCKS = new Set([
	'minecraft:air',
	'minecraft:cave_air',
	'minecraft:void_air',
	'minecraft:water',
	'minecraft:lava',
])

const NON_FULL_SIDE_PATTERNS = [
	/_banner$/,
	/_button$/,
	/_carpet$/,
	/_coral$/,
	/_coral_fan$/,
	/_door$/,
	/_fence$/,
	/_fence_gate$/,
	/_flower$/,
	/_glass_pane$/,
	/_hanging_sign$/,
	/_leaves$/,
	/_pressure_plate$/,
	/_rail$/,
	/_sapling$/,
	/_sign$/,
	/_slab$/,
	/_stairs$/,
	/_torch$/,
	/_trapdoor$/,
	/_wall$/,
	/_wall_banner$/,
	/_wall_hanging_sign$/,
	/_wall_sign$/,
	/_wall_torch$/,
	/_wool_carpet$/,
	/^attached_/,
	/^potted_/,
	/amethyst_cluster$/,
	/azalea$/,
	/bamboo$/,
	/bell$/,
	/big_dripleaf$/,
	/brewing_stand$/,
	/cake$/,
	/chain$/,
	/chest$/,
	/cocoa$/,
	/comparator$/,
	/conduit$/,
	/dead_bush$/,
	/decorated_pot$/,
	/end_rod$/,
	/fern$/,
	/grass$/,
	/grindstone$/,
	/kelp$/,
	/ladder$/,
	/lantern$/,
	/lever$/,
	/lightning_rod$/,
	/mangrove_roots$/,
	/mushroom$/,
	/pane$/,
	/repeater$/,
	/scaffolding$/,
	/seagrass$/,
	/skull$/,
	/soul_lantern$/,
	/sugar_cane$/,
	/turtle_egg$/,
	/twisting_vines$/,
	/vine$/,
	/weeping_vines$/,
]

function getBlockPath(name: string) {
	return name.includes(':') ? name.split(':')[1] : name
}

function isPaneLike(name: string) {
	const path = getBlockPath(name)
	return path === 'iron_bars' || path.endsWith('glass_pane')
}

function isFenceLike(name: string) {
	const path = getBlockPath(name)
	return path === 'nether_brick_fence' || (path.endsWith('_fence') && !path.endsWith('_fence_gate'))
}

function hasHorizontalConnectionStates(name: string) {
	return isPaneLike(name) || isFenceLike(name)
}

function isFullSideBlock(name: string) {
	if (!name || AIR_LIKE_BLOCKS.has(name)) return false
	const path = getBlockPath(name)
	return !NON_FULL_SIDE_PATTERNS.some(pattern => pattern.test(path))
}

function shouldSetHorizontalConnection(sourceName: string, neighborName: string) {
	if (!neighborName || AIR_LIKE_BLOCKS.has(neighborName)) return false
	if (isPaneLike(sourceName)) return isPaneLike(neighborName) || isFullSideBlock(neighborName)
	if (isFenceLike(sourceName)) return isFenceLike(neighborName) || isFullSideBlock(neighborName)
	return false
}

export class Structure implements StructureProvider {
	public static readonly REGISTRY = Registry.createAndRegister<Structure>('structures')

	public static readonly EMPTY = new Structure(BlockPos.ZERO)

	private blocksMap: StoredBlock[] = []
	private readonly xStride: number
	private readonly yStride: number
	private placedBlocksCache: PlacedBlock[] | null = null
	private placedBlocksMapCache: (PlacedBlock | undefined)[] | null = null
	private readonly paletteIndex = new Map<string, number>()

	constructor(
		private readonly size: BlockPos,
		private readonly palette: BlockState[] = [],
		private readonly blocks: StoredBlock[] = []
	) {
		this.xStride = size[1] * size[2]
		this.yStride = size[2]
		this.palette.forEach((state, index) => {
			this.paletteIndex.set(state.toString(), index)
		})
		blocks.forEach(block => {
			if (!this.isInside(block.pos)) {
				throw new Error(`Found block at ${block.pos} which is outside the structure bounds ${this.size}`)
			}
			this.blocksMap[this.getIndex(block.pos)] = block
		})
	}

	public getSize() {
		return this.size
	}

	public addBlock(pos: BlockPos, name: Identifier | string, properties?: { [key: string]: string }, nbt?: NbtCompound) {
		if (!this.isInside(pos)) {
			throw new Error(`Cannot add block at ${pos} outside the structure bounds ${this.size}`)
		}
		const blockState = new BlockState(name, properties)
		const key = blockState.toString()
		let state = this.paletteIndex.get(key)
		if (state === undefined) {
			state = this.palette.length
			this.palette.push(blockState)
			this.paletteIndex.set(key, state)
		}
		const index = this.getIndex(pos)
		const existing = this.blocksMap[index]
		if (existing) {
			existing.state = state
			existing.nbt = nbt
		} else {
			const stored = { pos: BlockPos.create(pos[0], pos[1], pos[2]), state, nbt }
			this.blocks.push(stored)
			this.blocksMap[index] = stored
		}
		this.clearPlacedCaches()
		return this
	}

	public getBlocks(): PlacedBlock[] {
		this.ensurePlacedCaches()
		return this.placedBlocksCache ?? []
	}

	public getBlock(pos: BlockPos): PlacedBlock | null {
		if (!this.isInside(pos)) return null
		this.ensurePlacedCaches()
		const block = this.placedBlocksMapCache?.[this.getIndex(pos)]
		return block ?? null
	}

	public clone() {
		return new Structure(
			BlockPos.create(this.size[0], this.size[1], this.size[2]),
			this.palette.map(state => new BlockState(state.getName(), { ...state.getProperties() })),
			this.blocks.map(block => ({
				pos: BlockPos.create(block.pos[0], block.pos[1], block.pos[2]),
				state: block.state,
				nbt: block.nbt,
			}))
		)
	}

	public updateBlockStates(): StructureBlockStateUpdateResult {
		const updates: { pos: BlockPos, name: string, properties: Record<string, string>, nbt?: NbtCompound }[] = []

		for (const block of this.getBlocks()) {
			const name = block.state.getName().toString()
			if (!hasHorizontalConnectionStates(name)) continue
			const properties = { ...block.state.getProperties() }
			for (const dir of HORIZONTAL_DIRECTIONS) {
				const neighbor = this.getBlock(BlockPos.add(block.pos, dir.offset))
				const neighborName = neighbor?.state.getName().toString() ?? ''
				properties[dir.key] = shouldSetHorizontalConnection(name, neighborName) ? 'true' : 'false'
			}
			if (properties.waterlogged === undefined) {
				properties.waterlogged = 'false'
			}
			if (new BlockState(name, properties).equals(block.state)) continue
			updates.push({ pos: block.pos, name, properties, nbt: block.nbt })
		}

		for (const update of updates) {
			this.addBlock(update.pos, update.name, update.properties, update.nbt)
		}

		return { updatedBlocks: updates.length }
	}

	private toPlacedBlock(block: StoredBlock): PlacedBlock {
		const state = this.palette[block.state]
		if (!state) {
			throw new Error(`Block at ${block.pos.join(' ')} in structure references invalid palette index ${block.state}`)
		}
		return {
			pos: block.pos,
			state: state,
			nbt: block.nbt,
		}
	}

	public isInside(pos: BlockPos) {
		return pos[0] >= 0 && pos[0] < this.size[0]
			&& pos[1] >= 0 && pos[1] < this.size[1]
			&& pos[2] >= 0 && pos[2] < this.size[2]
	}

	private getIndex(pos: BlockPos) {
		return pos[0] * this.xStride + pos[1] * this.yStride + pos[2]
	}

	private ensurePlacedCaches() {
		if (this.placedBlocksCache && this.placedBlocksMapCache) return
		this.placedBlocksCache = []
		this.placedBlocksMapCache = []
		for (const block of this.blocks) {
			const placed = this.toPlacedBlock(block)
			this.placedBlocksCache.push(placed)
			this.placedBlocksMapCache[this.getIndex(block.pos)] = placed
		}
	}

	private clearPlacedCaches() {
		this.placedBlocksCache = null
		this.placedBlocksMapCache = null
	}

	public toNbt(options: StructureNbtOptions = {}) {
		const source = options.updateBlockStates ? this.clone() : this
		if (options.updateBlockStates) {
			source.updateBlockStates()
		}
		const palette: BlockState[] = []
		const paletteIndex = new Map<string, number>()
		const blocks = source.blocks.map(storedBlock => {
			const block = source.toPlacedBlock(storedBlock)
			const key = block.state.toString()
			let state = paletteIndex.get(key)
			if (state === undefined) {
				state = palette.length
				palette.push(block.state)
				paletteIndex.set(key, state)
			}
			const tag = new NbtCompound()
				.set('pos', BlockPos.toNbt(block.pos))
				.set('state', new NbtInt(state))
			if (block.nbt && block.nbt.size > 0) {
				tag.set('nbt', block.nbt)
			}
			return tag
		})

		const nbt = new NbtCompound()
			.set('size', BlockPos.toNbt(this.size))
			.set('palette', new NbtList(palette.map(state => state.toNbt())))
			.set('blocks', new NbtList(blocks))
			.set('entities', new NbtList())

		if (options.dataVersion !== undefined) {
			nbt.set('DataVersion', new NbtInt(options.dataVersion))
		}
		return nbt
	}

	public writeNbt(options: StructureNbtWriteOptions = {}) {
		const file = new NbtFile(
			options.name ?? '',
			this.toNbt(options),
			options.compression ?? 'gzip',
			false,
			undefined,
		)
		return file.write()
	}

	public static fromNbt(nbt: NbtCompound) {
		const size = BlockPos.fromNbt(nbt.getList('size'))
		const palette = nbt.getList('palette', NbtType.Compound).map(tag => BlockState.fromNbt(tag))
		const blocks = nbt.getList('blocks', NbtType.Compound).map(tag => {
			const pos = BlockPos.fromNbt(tag.getList('pos'))
			const state = tag.getNumber('state')
			const nbt = tag.getCompound('nbt')
			return { pos, state, nbt: nbt.size > 0 ? nbt : undefined }
		})
		return new Structure(size, palette, blocks)
	}

	public static transform(pos: BlockPos, rotation: Rotation, pivot: BlockPos) {
		switch (rotation) {
			case Rotation.COUNTERCLOCKWISE_90:
				return BlockPos.create(pivot[0] - pivot[2] + pos[2], pos[1], pivot[0] + pivot[2] - pos[0])
			case Rotation.CLOCKWISE_90:
				return BlockPos.create(pivot[0] + pivot[2] - pos[2], pos[1], pivot[2] - pivot[0] + pos[0])
			case Rotation.CLOCKWISE_180:
				return BlockPos.create(pivot[0] + pivot[0] - pos[0], pos[1], pivot[2] + pivot[2] - pos[2])
			default:
				return pos
		}
	}
}
