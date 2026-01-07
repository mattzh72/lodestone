import { mat4, vec3 } from 'gl-matrix'
import { Structure, ThreeStructureRenderer, loadDefaultPackResources } from '../src/index.js'

type TimePreset = 'night' | 'day' | 'dusk'

type SunlightPreset = {
	direction: vec3,
	color: [number, number, number],
	ambientColor: [number, number, number],
	fillColor: [number, number, number],
	rimColor: [number, number, number],
	intensity: number,
	ambientIntensity: number,
	fillIntensity: number,
	rimIntensity: number,
	horizonFalloff: number,
	exposure: number,
	sky?: {
		zenithColor?: [number, number, number],
		horizonColor?: [number, number, number],
		groundColor?: [number, number, number],
		sunGlowColor?: [number, number, number],
		sunGlowIntensity?: number,
		sunGlowExponent?: number,
	},
	fog?: {
		color?: [number, number, number],
		density?: number,
		heightFalloff?: number,
	},
	shadow?: {
		enabled?: boolean,
		mapSize?: number,
		intensity?: number,
		softness?: number,
		frustumSize?: number,
	},
}

const SUNLIGHT_PRESETS: Record<TimePreset, SunlightPreset> = {
	night: {
		direction: vec3.fromValues(0.3, -0.8, 0.4),
		color: [0.15, 0.18, 0.35],
		ambientColor: [0.05, 0.08, 0.18],
		fillColor: [0.08, 0.1, 0.22],
		rimColor: [0.12, 0.15, 0.28],
		intensity: 0.3,
		ambientIntensity: 0.35,
		fillIntensity: 0.15,
		rimIntensity: 0.2,
		horizonFalloff: 0.4,
		exposure: 0.85,
		sky: {
			zenithColor: [0.02, 0.03, 0.08],
			horizonColor: [0.08, 0.1, 0.2],
			groundColor: [0.01, 0.01, 0.02],
		},
		fog: {
			color: [0.05, 0.08, 0.15],
			density: 0.0004,
			heightFalloff: 0.002,
		},
		shadow: {
			enabled: false,
			mapSize: 2048,
			intensity: 0.8,
			softness: 4.0,
			frustumSize: 120,
		},
	},
	day: {
		direction: vec3.fromValues(0.15, 0.95, 0.25),
		color: [1.0, 1.0, 0.92],
		ambientColor: [0.4, 0.52, 0.78],
		fillColor: [0.3, 0.36, 0.52],
		rimColor: [1.0, 0.92, 0.72],
		intensity: 1.25,
		ambientIntensity: 0.6,
		fillIntensity: 0.3,
		rimIntensity: 0.4,
		horizonFalloff: 0.8,
		exposure: 1.1,
		sky: {
			zenithColor: [0.18, 0.42, 0.8],
			horizonColor: [0.72, 0.88, 1.0],
			groundColor: [0.2, 0.22, 0.3],
		},
		fog: {
			color: [0.78, 0.86, 0.95],
			density: 0.00015,
			heightFalloff: 0.001,
		},
		shadow: {
			enabled: true,
			mapSize: 2048,
			intensity: 0.45,
			softness: 2.0,
			frustumSize: 140,
		},
	},
	dusk: {
		direction: vec3.fromValues(0.55, 0.2, -0.45),
		color: [1.0, 0.58, 0.32],
		ambientColor: [0.18, 0.2, 0.35],
		fillColor: [0.35, 0.18, 0.4],
		rimColor: [1.0, 0.45, 0.2],
		intensity: 1.05,
		ambientIntensity: 0.45,
		fillIntensity: 0.28,
		rimIntensity: 0.55,
		horizonFalloff: 0.6,
		exposure: 0.95,
		sky: {
			zenithColor: [0.08, 0.15, 0.32],
			horizonColor: [0.9, 0.42, 0.2],
			groundColor: [0.12, 0.12, 0.18],
		},
		fog: {
			color: [0.62, 0.42, 0.32],
			density: 0.0003,
			heightFalloff: 0.0015,
		},
		shadow: {
			enabled: true,
			mapSize: 2048,
			intensity: 0.6,
			softness: 3.2,
			frustumSize: 120,
		},
	},
}

class OrbitCamera {
	private xRotation = 0.5
	private yRotation = 0.9
	private distance = 30
	private dragging = false
	private lastPos: [number, number] | null = null

	constructor(private readonly canvas: HTMLCanvasElement, private readonly center: vec3) {
		canvas.addEventListener('mousedown', evt => {
			if (evt.button === 0) {
				this.dragging = true
				this.lastPos = [evt.clientX, evt.clientY]
			}
		})
		window.addEventListener('mouseup', () => {
			this.dragging = false
			this.lastPos = null
		})
		window.addEventListener('mousemove', evt => {
			if (!this.dragging || !this.lastPos) return
			this.yRotation += (evt.clientX - this.lastPos[0]) / 160
			this.xRotation += (evt.clientY - this.lastPos[1]) / 160
			this.xRotation = Math.max(-Math.PI / 3.2, Math.min(Math.PI / 2.2, this.xRotation))
			this.lastPos = [evt.clientX, evt.clientY]
		})
		canvas.addEventListener('wheel', evt => {
			evt.preventDefault()
			this.distance = Math.max(8, Math.min(90, this.distance + evt.deltaY * 0.02))
		}, { passive: false })
	}

	public getView(): mat4 {
		const view = mat4.create()
		mat4.translate(view, view, [0, 0, -this.distance])
		mat4.rotateX(view, view, this.xRotation)
		mat4.rotateY(view, view, this.yRotation)
		mat4.translate(view, view, [-this.center[0], -this.center[1], -this.center[2]])
		return view
	}
}

type BuildResult = { structure: Structure, blockCount: number }

function fillBox(structure: Structure, from: vec3, to: vec3, block: string, props?: Record<string, string>) {
	for (let x = from[0]; x < to[0]; x += 1) {
		for (let y = from[1]; y < to[1]; y += 1) {
			for (let z = from[2]; z < to[2]; z += 1) {
				structure.addBlock([x, y, z], block, props)
			}
		}
	}
}

function buildScene(seed: number): BuildResult {
	const size: vec3 = [48, 20, 48]
	const structure = new Structure([size[0], size[1], size[2]])
	let count = 0

	const add = (pos: vec3, block: string, props?: Record<string, string>) => {
		structure.addBlock(pos, block, props)
		count += 1
	}

	// Ground
	fillBox(structure, [0, 0, 0], [size[0], 1, size[2]], 'minecraft:sand')
	count += size[0] * size[2]

	// Platform
	fillBox(structure, [6, 1, 6], [42, 3, 42], 'minecraft:sandstone')
	count += (42 - 6) * (42 - 6) * 2

	// Trim border
	for (let x = 6; x < 42; x += 1) {
		add([x, 3, 6], 'minecraft:cut_sandstone')
		add([x, 3, 41], 'minecraft:cut_sandstone')
	}
	for (let z = 6; z < 42; z += 1) {
		add([6, 3, z], 'minecraft:cut_sandstone')
		add([41, 3, z], 'minecraft:cut_sandstone')
	}

	// Pillars
	const pillarPositions: vec3[] = [
		[12, 4, 12],
		[36, 4, 12],
		[12, 4, 36],
		[36, 4, 36],
	]
	pillarPositions.forEach(pos => {
		fillBox(structure, pos, [pos[0] + 2, pos[1] + 6, pos[2] + 2], 'minecraft:smooth_sandstone')
		count += 2 * 6 * 2
	})

	// Roof
	fillBox(structure, [10, 10, 10], [38, 12, 38], 'minecraft:smooth_sandstone')
	count += (38 - 10) * (38 - 10) * 2

	// Center altar
	fillBox(structure, [22, 4, 22], [26, 6, 26], 'minecraft:chiseled_sandstone')
	count += 4 * 2 * 4

	// Pool
	fillBox(structure, [16, 2, 16], [32, 3, 32], 'minecraft:water')
	count += (32 - 16) * (32 - 16)

	// Lanterns
	const lanterns: vec3[] = [
		[9, 4, 9],
		[38, 4, 9],
		[9, 4, 38],
		[38, 4, 38],
	]
	lanterns.forEach(pos => add(pos, 'minecraft:glowstone'))

	// Accent stairs
	for (let i = 0; i < 4; i += 1) {
		const offset = 2 + i
		add([24, 3 + i, offset], 'minecraft:sandstone_stairs', { facing: 'south', half: 'bottom', shape: 'straight', waterlogged: 'false' })
		add([24, 3 + i, 47 - offset], 'minecraft:sandstone_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' })
		add([offset, 3 + i, 24], 'minecraft:sandstone_stairs', { facing: 'east', half: 'bottom', shape: 'straight', waterlogged: 'false' })
		add([47 - offset, 3 + i, 24], 'minecraft:sandstone_stairs', { facing: 'west', half: 'bottom', shape: 'straight', waterlogged: 'false' })
	}

	// Scatter a few cacti for contrast
	const random = (value: number) => {
		const next = (Math.sin(value + seed) * 10000) % 1
		return next - Math.floor(next)
	}
	for (let i = 0; i < 6; i += 1) {
		const x = 8 + Math.floor(random(i) * 32)
		const z = 8 + Math.floor(random(i + 12) * 32)
		add([x, 1, z], 'minecraft:cactus', { age: '0' })
		if (random(i + 24) > 0.55) {
			add([x, 2, z], 'minecraft:cactus', { age: '0' })
		}
	}

	return { structure, blockCount: count }
}

async function runDemo() {
	const canvas = document.getElementById('structure-display') as HTMLCanvasElement
	const blockCountEl = document.getElementById('block-count') as HTMLSpanElement
	if (!canvas || !blockCountEl) return

	const baseUrl = new URL('./default-pack/', import.meta.url).toString()
	const { resources } = await loadDefaultPackResources({ baseUrl })

	let timePreset: TimePreset = 'night'
	let renderer: ThreeStructureRenderer | null = null
	let camera: OrbitCamera | null = null
	let structure: Structure | null = null

	const resizeRenderer = () => {
		if (!renderer) return
		const rect = canvas.getBoundingClientRect()
		canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatio))
		canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatio))
		renderer.setViewport(0, 0, canvas.width, canvas.height)
	}

	const createRenderer = (preset: TimePreset) => {
		if (!structure) return
		renderer?.dispose()
		renderer = new ThreeStructureRenderer(canvas, structure, resources, {
			chunkSize: 16,
			drawDistance: 160,
			useInvisibleBlockBuffer: false,
			sunlight: SUNLIGHT_PRESETS[preset],
		})
		resizeRenderer()
	}

	const rebuildScene = (seed: number) => {
		const result = buildScene(seed)
		structure = result.structure
		blockCountEl.textContent = result.blockCount.toLocaleString()
		const center = vec3.fromValues(result.structure.getSize()[0] / 2, 5, result.structure.getSize()[2] / 2)
		camera = new OrbitCamera(canvas, center)
		createRenderer(timePreset)
	}

	rebuildScene(Date.now() % 10000)

	const renderLoop = () => {
		if (!renderer || !camera) return
		renderer.drawStructure(camera.getView())
		requestAnimationFrame(renderLoop)
	}
	renderLoop()

	const resizeObserver = new ResizeObserver(() => {
		resizeRenderer()
	})
	resizeObserver.observe(canvas)

	document.querySelectorAll<HTMLButtonElement>('button[data-time]').forEach(button => {
		button.addEventListener('click', () => {
			const preset = button.dataset.time as TimePreset
			if (!preset || preset === timePreset) return
			timePreset = preset
			document.querySelectorAll<HTMLButtonElement>('button[data-time]').forEach(btn => btn.classList.toggle('active', btn === button))
			createRenderer(timePreset)
		})
	})

	const regenButton = document.getElementById('regen') as HTMLButtonElement | null
	regenButton?.addEventListener('click', () => {
		rebuildScene(Date.now() % 10000)
	})
}

runDemo().catch(err => {
	console.error('[lodestone demo] failed to start', err)
})
