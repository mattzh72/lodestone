export function clamp(x: number, min: number, max: number) {
	return Math.max(min, Math.min(max, x))
}

export function isPowerOfTwo(x: number) {
	return (x & (x - 1)) === 0
}

export function upperPowerOfTwo(x: number) {
	x -= 1
	x |= x >> 1
	x |= x >> 2
	x |= x >> 4
	x |= x >> 8
	x |= x >> 18
	x |= x >> 32
	return x + 1
}
