import { describe, expect, it } from 'vitest'
import { BlockState, Identifier, Structure } from '../../src/core/index.js'
import { NbtCompound, NbtFile, NbtInt, NbtList, NbtString, NbtType } from '../../src/nbt/index.js'

describe('Structure', () => {
	it('getSize', () => {
		const structureA = new Structure([1, 2, 3])
		expect(structureA.getSize()).toEqual([1, 2, 3])

		const structureB = new Structure([16, 30, 24])
		expect(structureB.getSize()).toEqual([16, 30, 24])
	})

	it('addBlock', () => {
		const structure = new Structure([1, 1, 1])
		const addedBlock = structure.addBlock([0, 0, 0], 'stone')
		expect(addedBlock).an.instanceOf(Structure)
		expect(structure).toEqual(addedBlock)
	})

	it('addBlock (outside)', () => {
		const structure = new Structure([1, 1, 1])
		expect(() => structure.addBlock([2, 0, 0], 'stone')).toThrow()
		expect(() => structure.addBlock([0, -1, 0], 'stone')).toThrow()
	})

	it('getBlock', () => {
		const structure = new Structure([1, 2, 1])
			.addBlock([0, 0, 0], 'stone')

		const blockA = structure.getBlock([0, 1, 0])
		expect(blockA).null

		const blockB = structure.getBlock([0, 0, 0])
		expect(blockB).an('object').with.any.keys('pos', 'state')
		expect(blockB?.state).an.instanceOf(BlockState)
		expect(blockB?.state).toEqual(new BlockState('stone'))
		expect(blockB?.pos).toEqual([0, 0, 0])
	})

	it('getBlocks', () => {
		const structure = new Structure([1, 3, 1])
			.addBlock([0, 0, 0], 'stone')
			.addBlock([0, 1, 0], 'stone')
			.addBlock([0, 2, 0], 'jigsaw', { orientation: 'east_up' })

		const blocks = structure.getBlocks()
		expect(blocks).an('array').with.lengthOf(3)

		const blockNames = blocks.map(b => b.state.getName())
		expect(blockNames).toEqual([Identifier.create('stone'), Identifier.create('stone'), Identifier.create('jigsaw')])
	})

	it('addBlock overwrites an existing position without duplicating caches', () => {
		const structure = new Structure([1, 1, 1])
			.addBlock([0, 0, 0], 'stone')

		expect(structure.getBlocks()).toHaveLength(1)

		structure.addBlock([0, 0, 0], 'dirt')

		expect(structure.getBlocks()).toHaveLength(1)
		expect(structure.getBlock([0, 0, 0])?.state).toEqual(new BlockState('dirt'))
	})

	it('fromNbt (empty)', () => {
		const nbt = new NbtCompound()
			.set('size', new NbtList([new NbtInt(0), new NbtInt(0), new NbtInt(0)]))
			.set('palette', new NbtList())
			.set('entities', new NbtList())
			.set('blocks', new NbtList())
		const structure = Structure.fromNbt(nbt)
		expect(structure).toEqual(new Structure([0, 0, 0]))
	})

	it('fromNbt (simple)', () => {
		const nbt = new NbtCompound()
			.set('size', new NbtList([new NbtInt(1), new NbtInt(2), new NbtInt(1)]))
			.set('palette', new NbtList([
				new NbtCompound()
					.set('Name', new NbtString('jigsaw'))
					.set('Properties', new NbtCompound().set('orientation', new NbtString('east_up'))),
			]))
			.set('entities', new NbtList())
			.set('blocks', new NbtList([
				new NbtCompound()
					.set('pos', new NbtList([new NbtInt(0), new NbtInt(0), new NbtInt(0)]))
					.set('state', new NbtInt(0)),
			]))
		const structureA = Structure.fromNbt(nbt)
		const structureB = new Structure([1, 2, 1])
			.addBlock([0, 0, 0], 'jigsaw', { orientation: 'east_up' })
		expect(structureA).toEqual(structureB)
	})

	it('toNbt', () => {
		const blockNbt = new NbtCompound()
			.set('id', new NbtString('minecraft:chest'))
		const structure = new Structure([2, 2, 1])
			.addBlock([0, 0, 0], 'minecraft:stone')
			.addBlock([1, 0, 0], 'minecraft:piston', { facing: 'up', extended: 'false' })
			.addBlock([0, 1, 0], 'minecraft:chest', undefined, blockNbt)

		const nbt = structure.toNbt({ dataVersion: 3210 })

		expect(nbt.getNumber('DataVersion')).toEqual(3210)
		expect(nbt.getList('size').map(tag => tag.getAsNumber())).toEqual([2, 2, 1])
		expect(nbt.getList('entities').length).toEqual(0)
		expect(nbt.getList('palette', NbtType.Compound).map(tag => BlockState.fromNbt(tag).toString())).toEqual([
			'minecraft:stone',
			'minecraft:piston[extended=false,facing=up]',
			'minecraft:chest',
		])
		const blocks = nbt.getList('blocks', NbtType.Compound)
		expect(blocks.length).toEqual(3)
		expect(blocks.getCompound(2).getCompound('nbt')).toEqual(blockNbt)
		expect(Structure.fromNbt(nbt)).toEqual(structure)
	})

	it('updateBlockStates sets pane connections from neighboring panes and solid blocks', () => {
		const structure = new Structure([5, 1, 3])
			.addBlock([0, 0, 1], 'minecraft:stone')
			.addBlock([1, 0, 1], 'minecraft:glass_pane')
			.addBlock([2, 0, 1], 'minecraft:glass_pane')
			.addBlock([3, 0, 1], 'minecraft:glass_pane')
			.addBlock([4, 0, 1], 'minecraft:stone')

		const result = structure.updateBlockStates()

		expect(result.updatedBlocks).toEqual(3)
		expect(structure.getBlock([1, 0, 1])?.state.toString()).toEqual('minecraft:glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]')
		expect(structure.getBlock([2, 0, 1])?.state.toString()).toEqual('minecraft:glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]')
		expect(structure.getBlock([3, 0, 1])?.state.toString()).toEqual('minecraft:glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]')
		expect(structure.updateBlockStates().updatedBlocks).toEqual(0)
	})

	it('updateBlockStates keeps pane and fence rules separate', () => {
		const structure = new Structure([3, 1, 3])
			.addBlock([0, 0, 0], 'minecraft:oak_fence')
			.addBlock([1, 0, 0], 'minecraft:oak_fence')
			.addBlock([2, 0, 0], 'minecraft:glass_pane')
			.addBlock([0, 0, 2], 'minecraft:glass_pane')
			.addBlock([1, 0, 2], 'minecraft:stone')
			.addBlock([2, 0, 2], 'minecraft:glass_pane')

		const result = structure.updateBlockStates()

		expect(result.updatedBlocks).toEqual(5)
		expect(structure.getBlock([0, 0, 0])?.state.toString()).toEqual('minecraft:oak_fence[east=true,north=false,south=false,waterlogged=false,west=false]')
		expect(structure.getBlock([1, 0, 0])?.state.toString()).toEqual('minecraft:oak_fence[east=false,north=false,south=false,waterlogged=false,west=true]')
		expect(structure.getBlock([2, 0, 0])?.state.toString()).toEqual('minecraft:glass_pane[east=false,north=false,south=false,waterlogged=false,west=false]')
		expect(structure.getBlock([0, 0, 2])?.state.toString()).toEqual('minecraft:glass_pane[east=true,north=false,south=false,waterlogged=false,west=false]')
		expect(structure.getBlock([2, 0, 2])?.state.toString()).toEqual('minecraft:glass_pane[east=false,north=false,south=false,waterlogged=false,west=true]')
		expect(structure.updateBlockStates().updatedBlocks).toEqual(0)
	})

	it('toNbt updateBlockStates writes connected panes without mutating source structure', () => {
		const structure = new Structure([3, 1, 1])
			.addBlock([0, 0, 0], 'minecraft:stone')
			.addBlock([1, 0, 0], 'minecraft:glass_pane')
			.addBlock([2, 0, 0], 'minecraft:stone')

		const nbt = structure.toNbt({ updateBlockStates: true })
		const connected = Structure.fromNbt(nbt)

		expect(connected.getBlock([1, 0, 0])?.state.toString()).toEqual('minecraft:glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]')
		expect(structure.getBlock([1, 0, 0])?.state.toString()).toEqual('minecraft:glass_pane')
	})

	it('toNbt leaves panes untouched by default', () => {
		const structure = new Structure([3, 1, 1])
			.addBlock([0, 0, 0], 'minecraft:stone')
			.addBlock([1, 0, 0], 'minecraft:glass_pane')
			.addBlock([2, 0, 0], 'minecraft:stone')

		const nbt = structure.toNbt()
		const plain = Structure.fromNbt(nbt)

		expect(plain.getBlock([1, 0, 0])?.state.toString()).toEqual('minecraft:glass_pane')
	})

	it('writeNbt', () => {
		const structure = new Structure([1, 1, 1])
			.addBlock([0, 0, 0], 'minecraft:stone')

		const bytes = structure.writeNbt({ dataVersion: 3210 })
		const file = NbtFile.read(bytes)

		expect(file.compression).toEqual('gzip')
		expect(file.root.getNumber('DataVersion')).toEqual(3210)
		expect(Structure.fromNbt(file.root)).toEqual(structure)
	})
})
