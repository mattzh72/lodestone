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
		stars?: {
			enabled?: boolean,
			density?: number,
			brightness?: number,
		},
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
	disc?: {
		size?: number,
		distance?: number,
		coreColor?: [number, number, number],
		glowColor?: [number, number, number],
		coreIntensity?: number,
		glowIntensity?: number,
		softness?: number,
	},
}

type DemoBuild = {
	name: string,
	author: string,
	file: string,
}

const SUNLIGHT_PRESETS: Record<TimePreset, SunlightPreset> = {
	night: {
		direction: vec3.fromValues(-0.2, 0.92, 0.32),
		color: [0.3, 0.34, 0.55],
		ambientColor: [0.08, 0.12, 0.22],
		fillColor: [0.12, 0.14, 0.26],
		rimColor: [0.18, 0.2, 0.35],
		intensity: 0.5,
		ambientIntensity: 0.45,
		fillIntensity: 0.25,
		rimIntensity: 0.28,
		horizonFalloff: 0.4,
		exposure: 0.95,
		sky: {
			zenithColor: [0.02, 0.03, 0.08],
			horizonColor: [0.08, 0.1, 0.2],
			groundColor: [0.01, 0.01, 0.02],
			sunGlowColor: [0.45, 0.55, 0.78],
			sunGlowIntensity: 0.12,
			sunGlowExponent: 10.0,
			stars: {
				enabled: true,
				density: 0.4,
				brightness: 0.95,
			},
		},
		disc: {
			size: 18,
			distance: 210,
			coreColor: [0.82, 0.88, 1.0],
			glowColor: [0.5, 0.6, 0.85],
			coreIntensity: 1.1,
			glowIntensity: 0.6,
			softness: 0.32,
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

const DEMO_BUILDS: DemoBuild[] = [
	{
		name: 'Dark Fortress',
		author: 'Raaamseeel',
		file: 'dark-fortress.litematic',
	},
	{
		name: '19640',
		author: 'abfielder',
		file: '19640-from-abfielder.litematic',
	},
	{
		name: 'Cathedral Final V1.0',
		author: 'abfielder',
		file: 'cathedral-final-v1.0-from-abfielder.litematic',
	},
]
const MAX_RENDER_SCALE = 1.5
const MIN_RENDER_SCALE = 0.6
const TARGET_FRAME_MS = 1000 / 60
const SCALE_ADJUST_INTERVAL_MS = 500
const SCALE_STEP_UP = 0.05
const SCALE_STEP_DOWN = 0.1

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

async function loadLitematic(build: DemoBuild): Promise<Structure> {
	const response = await fetch(new URL(`./public/${build.file}`, import.meta.url).toString())
	const buffer = await response.arrayBuffer()
	return LitematicLoader.load(new Uint8Array(buffer))
}

async function runDemo() {
	const canvas = document.getElementById('structure-display') as HTMLCanvasElement
	const blockCountEl = document.getElementById('block-count') as HTMLSpanElement
	const buildNameEl = document.getElementById('build-name') as HTMLSpanElement
	const buildAuthorEl = document.getElementById('build-author') as HTMLSpanElement
	const buildSizeEl = document.getElementById('build-size') as HTMLSpanElement
	const buildFooterEl = document.getElementById('build-footer') as HTMLSpanElement
	const prevBuildButton = document.getElementById('prev-build') as HTMLButtonElement
	const nextBuildButton = document.getElementById('next-build') as HTMLButtonElement
	const panelEl = document.getElementById('render-panel') as HTMLDivElement
	const loadingEl = document.getElementById('loading') as HTMLDivElement
	const loadingTextEl = document.getElementById('loading-text') as HTMLSpanElement
	if (!canvas || !blockCountEl || !buildNameEl || !buildAuthorEl || !buildSizeEl || !buildFooterEl || !prevBuildButton || !nextBuildButton || !panelEl || !loadingEl || !loadingTextEl) return

	const baseUrl = new URL('./default-pack/', import.meta.url).toString()
	const { resources } = await loadDefaultPackResources({ baseUrl })

	let timePreset: TimePreset = 'day'
	let renderer: ThreeStructureRenderer | null = null
	let camera: OrbitCamera | null = null
	let structure: Structure | null = null
	let buildIndex = 0
	let loadToken = 0
	let renderScale = Math.min(devicePixelRatio, MAX_RENDER_SCALE)

	const resizeRenderer = () => {
		if (!renderer) return
		const rect = canvas.getBoundingClientRect()
		const scale = Math.min(devicePixelRatio, MAX_RENDER_SCALE, renderScale)
		renderer.setViewport(0, 0, rect.width, rect.height, scale)
	}

	const ensureRenderer = (preset: TimePreset) => {
		if (!structure) return
		if (!renderer) {
			renderer = new ThreeStructureRenderer(canvas, structure, resources, {
				chunkSize: 16,
				drawDistance: 1000,
				useInvisibleBlockBuffer: false,
				sunlight: SUNLIGHT_PRESETS[preset],
				asyncBuild: true,
				asyncChunkBuildTimeMs: 8,
			})
		} else {
			renderer.setSunlight(SUNLIGHT_PRESETS[preset])
			renderer.setStructure(structure)
		}
		resizeRenderer()
	}

	const setBuildLoading = (isLoading: boolean) => {
		prevBuildButton.disabled = isLoading
		nextBuildButton.disabled = isLoading
	}

	const setLoadingState = (isLoading: boolean, message?: string, isBuilding?: boolean) => {
		loadingEl.classList.toggle('active', isLoading)
		panelEl.classList.toggle('is-building', Boolean(isLoading && isBuilding))
		if (message) {
			loadingTextEl.textContent = message
		}
	}

	const updateBuildLabels = (build: DemoBuild, size?: vec3) => {
		buildNameEl.textContent = build.name
		buildAuthorEl.textContent = build.author
		if (size) {
			buildSizeEl.textContent = `${size[0]}×${size[1]}×${size[2]}`
		}
		buildFooterEl.textContent = `Lodestone demo — rendering "${build.name}" by ${build.author} using the Litematic loader.`
	}

	const loadScene = async (index = buildIndex) => {
		const nextIndex = (index + DEMO_BUILDS.length) % DEMO_BUILDS.length
		const build = DEMO_BUILDS[nextIndex]
		const token = ++loadToken
		setBuildLoading(true)
		setLoadingState(true, 'Loading build...')
		blockCountEl.textContent = '-'
		buildSizeEl.textContent = '-'
		updateBuildLabels(build)
		try {
			const nextStructure = await loadLitematic(build)
			if (token !== loadToken) return
			structure = nextStructure
			buildIndex = nextIndex
			blockCountEl.textContent = structure.getBlocks().length.toLocaleString()
			const size = structure.getSize()
			updateBuildLabels(build, size)
			const center = vec3.fromValues(size[0] / 2, size[1] / 3, size[2] / 2)
			camera = new OrbitCamera(canvas, center)
			setLoadingState(true, 'Building meshes...', true)
			ensureRenderer(timePreset)
			const activeRenderer = renderer
			if (activeRenderer) {
				await activeRenderer.whenReady()
				if (token !== loadToken) return
			}
		} catch (err) {
			if (token !== loadToken) return
			console.error('[lodestone demo] failed to load build', err)
		} finally {
			if (token === loadToken) {
				setBuildLoading(false)
				setLoadingState(false)
			}
		}
	}

	await loadScene()

	let lastFrameTime = 0
	let lastScaleAdjust = 0
	let frameTimeAccum = 0
	let frameSamples = 0

	const renderLoop = (time: number) => {
		if (!renderer || !camera) return
		if (lastFrameTime) {
			const delta = time - lastFrameTime
			frameTimeAccum += delta
			frameSamples += 1
		}
		lastFrameTime = time

		if (time - lastScaleAdjust >= SCALE_ADJUST_INTERVAL_MS && frameSamples > 0) {
			const averageFrameTime = frameTimeAccum / frameSamples
			const maxScale = Math.min(devicePixelRatio, MAX_RENDER_SCALE)
			if (averageFrameTime > TARGET_FRAME_MS * 1.35 && renderScale > MIN_RENDER_SCALE) {
				renderScale = Math.max(MIN_RENDER_SCALE, renderScale - SCALE_STEP_DOWN)
				resizeRenderer()
			} else if (averageFrameTime < TARGET_FRAME_MS * 0.85 && renderScale < maxScale) {
				renderScale = Math.min(maxScale, renderScale + SCALE_STEP_UP)
				resizeRenderer()
			}
			frameTimeAccum = 0
			frameSamples = 0
			lastScaleAdjust = time
		}

		renderer.drawStructure(camera.getView())
		requestAnimationFrame(renderLoop)
	}
	requestAnimationFrame(renderLoop)

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
			renderer?.setSunlight(SUNLIGHT_PRESETS[preset])
		})
	})

	prevBuildButton.addEventListener('click', () => {
		void loadScene(buildIndex - 1)
	})

	nextBuildButton.addEventListener('click', () => {
		void loadScene(buildIndex + 1)
	})
}

runDemo().catch(err => {
	console.error('[lodestone demo] failed to start', err)
})
