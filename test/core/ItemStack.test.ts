import { describe, expect, it } from 'vitest'
import { ItemStack } from '../../src/core/index.js'

describe('ItemStack', () => {
	it('parses count suffixes', () => {
		const item = ItemStack.fromString('minecraft:stone 12')

		expect(item.id.toString()).toEqual('minecraft:stone')
		expect(item.count).toEqual(12)
	})

	it('roundtrips components and count through strings', () => {
		const item = ItemStack.fromString('minecraft:stone[minecraft:custom_name="hello",!minecraft:trim] 3')

		expect(ItemStack.fromString(item.toString())).toEqual(item)
	})
})
