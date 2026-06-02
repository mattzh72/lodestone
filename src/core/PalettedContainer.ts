export class PalettedContainer<T extends Equalable> {
	private static readonly WIDTH = 16

	private readonly storage: number[]
	private readonly palette: T[]

	constructor(
		public readonly size: number,
		public readonly defaultValue: T,
	) {
		this.storage = Array(size).fill(0)
		this.palette = [defaultValue]
	}

	private index(x: number, y: number, z: number) {
		if (!this.isLocalCoordinate(x) || !this.isLocalCoordinate(y) || !this.isLocalCoordinate(z)) {
			throw new Error(`Coordinates ${x},${y},${z} are outside paletted container bounds 0..15`)
		}
		return (x << 8) + (y << 4) + z
	}

	private isLocalCoordinate(value: number) {
		return Number.isInteger(value) && value >= 0 && value < PalettedContainer.WIDTH
	}

	public get(x: number, y: number, z: number) {
		const id = this.storage[this.index(x, y, z)]
		return this.palette[id]
	}

	public set(x: number, y: number, z: number, value: T) {
		let id = this.palette.findIndex(b => b.equals(value))
		if (id === -1) {
			id = this.palette.length
			this.palette.push(value)
		}
		this.storage[this.index(x, y, z)] = id
	}
}

interface Equalable {
	equals(other: this): boolean
}
