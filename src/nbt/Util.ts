export function hasGzipHeader(array: Uint8Array) {
	return array.length >= 2 && array[0] === 0x1f && array[1] === 0x8b
}

export function hasZlibHeader(array: Uint8Array) {
	return array.length >= 2 && array[0] === 0x78
		&& (array[1] === 0x01 || array[1] === 0x5e || array[1] === 0x9c || array[1] === 0xda)
}

export function getBedrockHeader(array: Uint8Array) {
	const head = array.slice(0, 8)
	const view = new DataView(head.buffer, head.byteOffset)
	const version = view.getUint32(0, true)
	const length = view.getUint32(4, true)
	if (head.length === 8 && version > 0 && version < 100 && length === array.byteLength - 8) {
		return version
	}
	return undefined
}

const UTF8_ENCODER = new TextEncoder()
const UTF8_DECODER = new TextDecoder()

export function encodeUTF8(str: string) {
	return UTF8_ENCODER.encode(str)
}

export function decodeUTF8(array: ArrayLike<number>) {
	return UTF8_DECODER.decode(array instanceof Uint8Array ? array : Uint8Array.from(array))
}
