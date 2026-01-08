import type { NbtCompound } from '../nbt/index.js'
import { NbtType } from '../nbt/index.js'
import { BlockPos } from './BlockPos.js'
import { BlockState } from './BlockState.js'
import type { Identifier } from './Identifier.js'
import { Registry } from './Registry.js'
import { Rotation } from './Rotation.js'
import type { StructureProvider } from './StructureProvider.js'

type StoredBlock = { pos: BlockPos, state: number, nbt?: NbtCompound }
export type PlacedBlock = { pos: BlockPos, state: BlockState, nbt?: NbtCompound }

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
		const stored = { pos, state, nbt }
		this.blocks.push(stored)
		const index = this.getIndex(pos)
		this.blocksMap[index] = stored
		if (this.placedBlocksCache && this.placedBlocksMapCache) {
			const placed = this.toPlacedBlock(stored)
			this.placedBlocksCache.push(placed)
			this.placedBlocksMapCache[index] = placed
		}
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
