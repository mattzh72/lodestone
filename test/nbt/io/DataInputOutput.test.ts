import { describe, expect, it } from 'vitest'
import { NbtString, RawDataInput, RawDataOutput } from '../../../src/nbt/index.js'

describe('RawDataInput/RawDataOutput', () => {
	it('roundtrips strings with unsigned 16-bit byte lengths', () => {
		const value = 'a'.repeat(40000)
		const output = new RawDataOutput()
		new NbtString(value).toBytes(output)

		const input = new RawDataInput(output.getData())
		expect(NbtString.fromBytes(input)).toEqual(new NbtString(value))
	})

	it('rejects strings longer than the NBT byte-length limit', () => {
		const output = new RawDataOutput()

		expect(() => output.writeString('a'.repeat(65536))).toThrow()
	})

	it('does not read past the provided Uint8Array view', () => {
		const input = new RawDataInput(new Uint8Array([0, 1, 2, 3]).subarray(0, 2))

		expect(() => input.readInt()).toThrow()
	})
})
