import type { BlockPos } from './BlockPos.js'
import { BlockState } from './BlockState.js'
import type { ChunkPos } from './ChunkPos.js'
import { ChunkSection } from './ChunkSection.js'

export class Chunk {
	public sections: (ChunkSection | null)[]

	constructor(
		public readonly minY: number,
		public readonly height: number,
		public readonly pos: ChunkPos,
	) {
		this.sections = Array(this.sectionsCount).fill(null)
	}

	public get maxY() {
		return this.minY + this.height
	}

	public get minSection() {
		return this.minY >> 4
	}

	public get maxSection() {
		return ((this.maxY - 1) >> 4) + 1
	}

	public get sectionsCount() {
		return this.maxSection - this.minSection
	}

	public getSectionIndex(y: number) {
		return (y >> 4) - this.minSection
	}

	public getBlockState(pos: BlockPos): BlockState {
		const [x, y, z] = pos
		if (!this.isYInside(y)) return BlockState.AIR
		const section = this.sections[this.getSectionIndex(y)]
		return section?.getBlockState(x & 0xF, y & 0xF, z & 0xF) ?? BlockState.AIR
	}

	public setBlockState(pos: BlockPos, state: BlockState) {
		const [x, y, z] = pos
		if (!this.isYInside(y)) {
			throw new Error(`Cannot set block at y=${y} outside chunk bounds ${this.minY}..${this.maxY - 1}`)
		}
		const sectionIndex = this.getSectionIndex(y)
		let section = this.sections[sectionIndex]
		if (section === null) {
			if (state.equals(BlockState.AIR)) return
			section = this.getOrCreateSection(sectionIndex)
		}
		section.setBlockState(x & 0xF, y & 0xF, z & 0xF, state)
	}

	public getOrCreateSection(index: number): ChunkSection {
		if (index < 0 || index >= this.sectionsCount) {
			throw new Error(`Section index ${index} is outside chunk section bounds 0..${this.sectionsCount - 1}`)
		}
		if (this.sections[index] == null) {
			this.sections[index] = new ChunkSection(this.minSection + index)
		}
		return this.sections[index] as ChunkSection
	}

	private isYInside(y: number) {
		return y >= this.minY && y < this.maxY
	}
}
