import { mat4, vec3 } from 'gl-matrix'
import { Structure, ThreeStructureRenderer, loadDefaultPackResources, LitematicLoader } from '../src/index.js'

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
			this.distance = Math.max(5, Math.min(400, this.distance + evt.deltaY * 0.08))
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

async function loadLitematic(): Promise<Structure> {
	const response = await fetch(new URL('./public/dark-fortress.litematic', import.meta.url).toString())
	const buffer = await response.arrayBuffer()
	return LitematicLoader.load(new Uint8Array(buffer))
}

async function runDemo() {
	const canvas = document.getElementById('structure-display') as HTMLCanvasElement
	const blockCountEl = document.getElementById('block-count') as HTMLSpanElement
	if (!canvas || !blockCountEl) return

	const baseUrl = new URL('./default-pack/', import.meta.url).toString()
	const { resources } = await loadDefaultPackResources({ baseUrl })

	let timePreset: TimePreset = 'day'
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
			drawDistance: 1000,
			useInvisibleBlockBuffer: false,
			sunlight: SUNLIGHT_PRESETS[preset],
		})
		resizeRenderer()
	}

	const loadScene = async () => {
		structure = await loadLitematic()
		blockCountEl.textContent = structure.getBlocks().length.toLocaleString()
		const size = structure.getSize()
		const center = vec3.fromValues(size[0] / 2, size[1] / 3, size[2] / 2)
		camera = new OrbitCamera(canvas, center)
		createRenderer(timePreset)
	}

	await loadScene()

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
}

runDemo().catch(err => {
	console.error('[lodestone demo] failed to start', err)
})
