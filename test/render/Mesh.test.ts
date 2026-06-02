import { describe, expect, it, vi } from 'vitest'
import { Vector } from '../../src/math/index.js'
import { Mesh, Quad } from '../../src/render/index.js'

function createGl() {
	return {
		ARRAY_BUFFER: 0x8892,
		ELEMENT_ARRAY_BUFFER: 0x8893,
		DYNAMIC_DRAW: 0x88e8,
		UNSIGNED_SHORT: 0x1403,
		UNSIGNED_INT: 0x1405,
		createBuffer: vi.fn(() => ({} as WebGLBuffer)),
		bindBuffer: vi.fn(),
		bufferData: vi.fn(),
		deleteBuffer: vi.fn(),
		getExtension: vi.fn(() => ({})),
	} as unknown as WebGLRenderingContext & {
		bufferData: ReturnType<typeof vi.fn>,
		getExtension: ReturnType<typeof vi.fn>,
	}
}

function quad() {
	return Quad.fromPoints(
		new Vector(0, 0, 0),
		new Vector(1, 0, 0),
		new Vector(1, 1, 0),
		new Vector(0, 1, 0),
	)
}

describe('Mesh', () => {
	it('uses 16-bit indices when vertex count fits', () => {
		const gl = createGl()
		const mesh = new Mesh([quad()])

		mesh.rebuild(gl, {})

		expect(mesh.indexType).toEqual(gl.UNSIGNED_SHORT)
		expect(gl.bufferData.mock.calls[0][1]).toBeInstanceOf(Uint16Array)
	})

	it('uses 32-bit indices when vertex count exceeds Uint16 range', () => {
		const gl = createGl()
		const mesh = new Mesh(Array.from({ length: 0x4001 }, quad))

		mesh.rebuild(gl, {})

		expect(mesh.indexType).toEqual(gl.UNSIGNED_INT)
		expect(gl.getExtension).toHaveBeenCalledWith('OES_element_index_uint')
		expect(gl.bufferData.mock.calls[0][1]).toBeInstanceOf(Uint32Array)
	})
})
