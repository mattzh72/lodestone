import { describe, expect, it } from 'vitest'
import { hasZlibHeader } from '../../src/nbt/Util.js'

describe('NBT Util', () => {
	it('recognizes common zlib headers', () => {
		expect(hasZlibHeader(new Uint8Array([0x78, 0x01]))).toBeTruthy()
		expect(hasZlibHeader(new Uint8Array([0x78, 0x5e]))).toBeTruthy()
		expect(hasZlibHeader(new Uint8Array([0x78, 0x9c]))).toBeTruthy()
		expect(hasZlibHeader(new Uint8Array([0x78, 0xda]))).toBeTruthy()
	})
})
