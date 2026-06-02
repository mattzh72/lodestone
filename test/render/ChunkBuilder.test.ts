import { describe, expect, it } from 'vitest'
import { BlockState, Identifier, Structure } from '../../src/core/index.js'
import { ChunkBuilder, type Resources } from '../../src/render/index.js'

const resources: Resources = {
	getBlockDefinition() { return null },
	getBlockModel() { return null },
	getTextureAtlas() { return {} as ImageData },
	getTextureUV() { return [0, 0, 1, 1] },
	getBlockFlags() { return null },
	getBlockProperties() { return null },
	getDefaultBlockProperties(id: Identifier) {
		return id.is('stone') ? { facing: 'north', lit: 'false' } : null
	},
}

describe('ChunkBuilder', () => {
	it('does not mutate block state properties when applying defaults', () => {
		const builder = new ChunkBuilder({} as WebGLRenderingContext, new Structure([1, 1, 1]), resources, 16, false)
		const state = new BlockState('stone')

		const props = builder['getBlockProps'](state)

		expect(props).toEqual({ facing: 'north', lit: 'false' })
		expect(state.getProperties()).toEqual({})
	})

	it('preserves explicitly empty properties when applying defaults', () => {
		const builder = new ChunkBuilder({} as WebGLRenderingContext, new Structure([1, 1, 1]), resources, 16, false)
		const state = new BlockState('stone', { facing: '' })

		const props = builder['getBlockProps'](state)

		expect(props).toEqual({ facing: '', lit: 'false' })
		expect(state.getProperties()).toEqual({ facing: '' })
	})
})
