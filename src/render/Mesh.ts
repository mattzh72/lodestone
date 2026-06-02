import type { mat4 } from 'gl-matrix'
import type { Color } from '../index.js'
import { Vector } from '../index.js'
import { Line } from './Line.js'
import type { Quad } from './Quad.js'
import { Vertex } from './Vertex.js'

export class Mesh {
	public posBuffer: WebGLBuffer | undefined
	public colorBuffer: WebGLBuffer | undefined
	public textureBuffer: WebGLBuffer | undefined
	public textureLimitBuffer: WebGLBuffer | undefined
	public normalBuffer: WebGLBuffer | undefined
	public blockPosBuffer: WebGLBuffer | undefined
	public indexBuffer: WebGLBuffer | undefined
	public indexType: number | undefined

	public linePosBuffer: WebGLBuffer | undefined
	public lineColorBuffer: WebGLBuffer | undefined

	constructor(
		public quads: Quad[] = [],
		public lines: Line[] = []
	) {}

	public clear() {
		this.quads = []
		this.lines = []
		return this	
	}

	public isEmpty() {
		return this.quads.length === 0 && this.lines.length === 0
	}

	public quadVertices() {
		return this.quads.length * 4
	}

	public quadIndices() {
		return this.quads.length * 6
	}

	public lineVertices() {
		return this.lines.length * 2
	}

	public merge(other: Mesh) {
		for (const quad of other.quads) {
			this.quads.push(quad)
		}
		for (const line of other.lines) {
			this.lines.push(line)
		}
		return this
	}

	public addLine(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: Color) {
		const line = new Line(
			Vertex.fromPos(new Vector(x1, y1, z1)),
			Vertex.fromPos(new Vector(x2, y2, z2))
		).setColor(color)
		this.lines.push(line)
		return this
	}

	public addLineCube(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: Color) {
		this.addLine(x1, y1, z1, x1, y1, z2, color)
		this.addLine(x2, y1, z1, x2, y1, z2, color)
		this.addLine(x1, y1, z1, x2, y1, z1, color)
		this.addLine(x1, y1, z2, x2, y1, z2, color)

		this.addLine(x1, y1, z1, x1, y2, z1, color)
		this.addLine(x2, y1, z1, x2, y2, z1, color)
		this.addLine(x1, y1, z2, x1, y2, z2, color)
		this.addLine(x2, y1, z2, x2, y2, z2, color)

		this.addLine(x1, y2, z1, x1, y2, z2, color)
		this.addLine(x2, y2, z1, x2, y2, z2, color)
		this.addLine(x1, y2, z1, x2, y2, z1, color)
		this.addLine(x1, y2, z2, x2, y2, z2, color)

		return this
	}

	public transform(transformation: mat4) {
		for (const quad of this.quads) {
			quad.transform(transformation)
		}
		return this
	}

	public computeNormals() {
		for (const quad of this.quads) {
			const normal = quad.normal()
			quad.forEach(v => v.normal = normal)
		}
	}

	public rebuild(gl: WebGLRenderingContext, options: { pos?: boolean, color?: boolean, texture?: boolean, normal?: boolean, blockPos?: boolean, usage?: number }) {
		const usage = options.usage ?? gl.DYNAMIC_DRAW

		const rebuildBuffer = (buffer: WebGLBuffer | undefined, type: number, data: BufferSource): WebGLBuffer | undefined => {
			if (!buffer) {
				buffer = gl.createBuffer() ?? undefined
			}
			if (!buffer) {
				throw new Error('Cannot create new buffer')
			}
			gl.bindBuffer(type, buffer)
			gl.bufferData(type, data, usage)
			return buffer
		}
		const rebuildBufferV = (array: Quad[] | Line[], buffer: WebGLBuffer | undefined, componentSize: number, mapper: (v: Vertex) => number[] | undefined): WebGLBuffer | undefined => {
			if (array.length === 0) {
				if (buffer) gl.deleteBuffer(buffer)
				return undefined
			}
			const verticesPerEntry = array[0] instanceof Line ? 2 : 4
			const data = new Float32Array(array.length * verticesPerEntry * componentSize)
			let offset = 0
			for (const entry of array) {
				for (const vertex of entry.vertices()) {
					const values = mapper(vertex)
					if (!values) throw new Error('Missing vertex component')
					for (let i = 0; i < componentSize; i += 1) {
						data[offset++] = values[i] ?? 0
					}
				}
			}
			return rebuildBuffer(buffer, gl.ARRAY_BUFFER, data)
		}

		if (options.pos) {
			this.posBuffer = rebuildBufferV(this.quads, this.posBuffer, 3, v => v.pos.components())
			this.linePosBuffer = rebuildBufferV(this.lines, this.linePosBuffer, 3, v => v.pos.components())
		}
		if (options.color) {
			this.colorBuffer = rebuildBufferV(this.quads, this.colorBuffer, 3, v => v.color)
			this.lineColorBuffer = rebuildBufferV(this.lines, this.lineColorBuffer, 3, v => v.color)
		}
		if (options.texture) {
			this.textureBuffer = rebuildBufferV(this.quads, this.textureBuffer, 2, v => v.texture)
			this.textureLimitBuffer = rebuildBufferV(this.quads, this.textureLimitBuffer, 4, v => v.textureLimit)
		}
		if (options.normal) {
			this.normalBuffer = rebuildBufferV(this.quads, this.normalBuffer, 3, v => v.normal?.components())
		}
		if (options.blockPos) {
			this.blockPosBuffer = rebuildBufferV(this.quads, this.blockPosBuffer, 3, v => v.blockPos?.components())
		}
		if (this.quads.length === 0) {
			if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer)
			this.indexBuffer = undefined
			this.indexType = undefined
		} else {
			const needsUint32 = this.quadVertices() > 0x10000
			if (needsUint32) {
				const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
				if (!isWebGL2 && !gl.getExtension('OES_element_index_uint')) {
					throw new Error('Mesh requires 32-bit indices, but OES_element_index_uint is not available')
				}
			}
			this.indexType = needsUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT
			const indices = needsUint32
				? new Uint32Array(this.quadIndices())
				: new Uint16Array(this.quadIndices())
			let offset = 0
			for (let i = 0; i < this.quads.length; i += 1) {
				const vertex = i * 4
				indices[offset++] = vertex
				indices[offset++] = vertex + 1
				indices[offset++] = vertex + 2
				indices[offset++] = vertex
				indices[offset++] = vertex + 2
				indices[offset++] = vertex + 3
			}
			this.indexBuffer = rebuildBuffer(this.indexBuffer, gl.ELEMENT_ARRAY_BUFFER, indices)
		}

		return this
	}
}
