import { decodeUTF8 } from '../Util.js'

export interface DataInput {
	readByte(): number
	readInt(): number
	readShort(): number
	readFloat(): number
	readDouble(): number
	readBytes(length: number): ArrayLike<number>
	readString(): string
}

export interface RawDataInputOptions {
	littleEndian?: boolean
	offset?: number
}

export class RawDataInput implements DataInput {
	private readonly littleEndian: boolean
	public offset: number
	private readonly array: Uint8Array
	private readonly view: DataView

	constructor (input: Uint8Array | ArrayLike<number> | ArrayBufferLike, options?: RawDataInputOptions) {
		this.littleEndian = options?.littleEndian ?? false
		this.offset = options?.offset ?? 0
		this.array = input instanceof Uint8Array ? input : new Uint8Array(input)
		this.view = new DataView(this.array.buffer, this.array.byteOffset, this.array.byteLength)
	}

	private readNumber(type: 'getInt8' | 'getInt16' | 'getInt32' | 'getFloat32' | 'getFloat64', size: number) {
		this.requireAvailable(size)
		const value = this.view[type](this.offset, this.littleEndian)
		this.offset += size
		return value
	}

	private requireAvailable(size: number) {
		if (size < 0) {
			throw new Error(`Cannot read negative byte length ${size}`)
		}
		if (this.offset + size > this.array.byteLength) {
			throw new Error(`Cannot read ${size} bytes at offset ${this.offset}; input length is ${this.array.byteLength}`)
		}
	}

	public readByte = this.readNumber.bind(this, 'getInt8', 1)
	public readShort = this.readNumber.bind(this, 'getInt16', 2)
	public readInt = this.readNumber.bind(this, 'getInt32', 4)
	public readFloat = this.readNumber.bind(this, 'getFloat32', 4)
	public readDouble = this.readNumber.bind(this, 'getFloat64', 8)

	public readBytes(length: number): ArrayLike<number> {
		this.requireAvailable(length)
		const bytes = this.array.slice(this.offset, this.offset + length)
		this.offset += length
		return bytes
	}

	public readString(): string {
		this.requireAvailable(2)
		const length = this.view.getUint16(this.offset, this.littleEndian)
		this.offset += 2
		const bytes = this.readBytes(length)
		return decodeUTF8(bytes)
	}
}
