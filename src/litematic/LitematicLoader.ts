import type { BlockPos } from '../core/index.js'
import { Structure, BlockState } from '../core/index.js'
import type { NbtCompound } from '../nbt/index.js'
import { NbtFile } from '../nbt/index.js'

/**
 * Loads Minecraft Litematica schematic files (.litematic)
 *
 * Litematic format specification:
 * - Root contains: MinecraftDataVersion, Version, Metadata, Regions, SubVersion
 * - Each region has: Size, Position, BlockStatePalette, BlockStates (packed long array)
 * - BlockStates is packed with variable bit width based on palette size
 */
export class LitematicLoader {
	/**
	 * Loads a litematic file from a buffer
	 * @param buffer The litematic file data (gzip compressed NBT)
	 * @param regionName Optional region name to load (default: first region)
	 * @returns Structure containing the loaded blocks
	 */
	public static load(buffer: Uint8Array, regionName?: string): Structure {
		const nbt = NbtFile.read(buffer, { compression: 'gzip' })
		return this.fromNbt(nbt.root, regionName)
	}

	/**
	 * Loads a litematic from parsed NBT data
	 * @param root The root NBT compound
	 * @param regionName Optional region name to load (default: first region)
	 * @returns Structure containing the loaded blocks
	 */
	public static fromNbt(root: NbtCompound, regionName?: string): Structure {
		const regions = root.getCompound('Regions')

		// Get the region to load
		let region: NbtCompound
		if (regionName) {
			region = regions.getCompound(regionName)
		} else {
			// Load first region
			const firstKey = regions.keys()[Symbol.iterator]().next().value
			if (!firstKey) {
				throw new Error('No regions found in litematic file')
			}
			region = regions.getCompound(firstKey)
		}

		return this.loadRegion(region)
	}

	private static loadRegion(region: NbtCompound): Structure {
		// Get region size
		const sizeNbt = region.getCompound('Size')
		const rawSize: BlockPos = [
			sizeNbt.getNumber('x') ?? 0,
			sizeNbt.getNumber('y') ?? 0,
			sizeNbt.getNumber('z') ?? 0,
		]
		const size: BlockPos = [
			Math.abs(rawSize[0]),
			Math.abs(rawSize[1]),
			Math.abs(rawSize[2]),
		]

		// Get position (offset) - currently unused but available for future use
		// const posNbt = region.getCompound('Position')
		// const offset: BlockPos = [
		// 	posNbt.getNumber('x') ?? 0,
		// 	posNbt.getNumber('y') ?? 0,
		// 	posNbt.getNumber('z') ?? 0,
		// ]

		// Parse palette
		const paletteList = region.getList('BlockStatePalette')
		const palette: BlockState[] = []

		paletteList.forEach((entry) => {
			if (!entry.isCompound()) return

			const name = entry.getString('Name') ?? 'minecraft:air'
			const properties: Record<string, string> = {}

			if (entry.has('Properties')) {
				const propsTag = entry.get('Properties')
				if (propsTag && propsTag.isCompound()) {
					propsTag.forEach((key: string, value: unknown) => {
						const tag = value as { getAsString?: () => string }
						properties[key] = tag.getAsString?.() ?? ''
					})
				}
			}

			palette.push(new BlockState(name, properties))
		})

		// Get packed block states
		const blockStatesNbt = region.getLongArray('BlockStates')
		// Convert NbtLongArray items to [high, low] pairs
		const blockStates = blockStatesNbt.getItems().map(item => item.getAsPair())

		// Calculate bits per block
		const bitsPerBlock = Math.max(2, Math.ceil(Math.log2(palette.length)))

		// Unpack block states using the correct algorithm
		const blocks = this.unpackBlockData(blockStates, bitsPerBlock, size[0], size[1], size[2])
		const isAir = palette.map(state => state.is('minecraft:air'))
		const storedBlocks: { pos: BlockPos, state: number }[] = []

		// Place blocks - blocks is [x][y][z]
		for (let x = 0; x < size[0]; x++) {
			for (let y = 0; y < size[1]; y++) {
				for (let z = 0; z < size[2]; z++) {
					const paletteIndex = blocks[x][y][z]
					if (paletteIndex >= 0 && paletteIndex < palette.length && !isAir[paletteIndex]) {
						storedBlocks.push({ pos: [x, y, z], state: paletteIndex })
					}
				}
			}
		}

		return new Structure(size, palette, storedBlocks)
	}

	/**
	 * Unpacks a long array containing packed indices
	 * Based on the litematic-viewer reference implementation
	 * @param longs Array of longs (as [high, low] pairs from NBT)
	 * @param nbits Number of bits per entry
	 * @param width Region width
	 * @param height Region height
	 * @param depth Region depth
	 * @returns 3D array of block palette indices [x][y][z]
	 */
	private static unpackBlockData(
		regionData: readonly [number, number][],
		nbits: number,
		width: number,
		height: number,
		depth: number
	): number[][][] {
		const mask = (1 << nbits) - 1
		const yShift = Math.abs(width * depth)
		const zShift = Math.abs(width)

		const blocks: number[][][] = []

		for (let x = 0; x < Math.abs(width); x++) {
			blocks[x] = []
			for (let y = 0; y < Math.abs(height); y++) {
				blocks[x][y] = []
				for (let z = 0; z < Math.abs(depth); z++) {
					// Calculate index using YZX order
					const index = y * yShift + z * zShift + x

					const startOffset = index * nbits

					// Work with 32-bit boundaries
					const startArrIndex = startOffset >>> 5 // divide by 32
					const endArrIndex = ((index + 1) * nbits - 1) >>> 5
					const startBitOffset = startOffset & 0x1f // % 32

					// Handle 64-bit longs stored as [high, low] pairs
					const halfInd = startArrIndex >>> 1
					let blockStart: number
					let blockEnd: number

					if ((startArrIndex & 0x1) === 0) {
						// Even index: use low32 as start, high32 as end
						blockStart = regionData[halfInd][1]
						blockEnd = regionData[halfInd][0]
					} else {
						// Odd index: use high32 as start, next low32 as end
						blockStart = regionData[halfInd][0]
						if (halfInd + 1 < regionData.length) {
							blockEnd = regionData[halfInd + 1][1]
						} else {
							blockEnd = 0x0
						}
					}

					let value: number
					if (startArrIndex === endArrIndex) {
						value = (blockStart >>> startBitOffset) & mask
					} else {
						const endOffset = 32 - startBitOffset
						value = ((blockStart >>> startBitOffset) & mask) | ((blockEnd << endOffset) & mask)
					}

					blocks[x][y][z] = value
				}
			}
		}

		return blocks
	}

	/**
	 * Gets metadata from a litematic file
	 */
	public static getMetadata(buffer: Uint8Array) {
		const nbt = NbtFile.read(buffer, { compression: 'gzip' })
		const metadata = nbt.root.getCompound('Metadata')

		const enclosingSize = metadata.getCompound('EnclosingSize')

		return {
			name: metadata.getString('Name') ?? 'Unnamed',
			author: metadata.getString('Author') ?? 'Unknown',
			description: metadata.getString('Description') ?? '',
			totalBlocks: metadata.getNumber('TotalBlocks') ?? 0,
			totalVolume: metadata.getNumber('TotalVolume') ?? 0,
			regionCount: metadata.getNumber('RegionCount') ?? 0,
			size: {
				x: enclosingSize.getNumber('x') ?? 0,
				y: enclosingSize.getNumber('y') ?? 0,
				z: enclosingSize.getNumber('z') ?? 0,
			},
		}
	}
}
