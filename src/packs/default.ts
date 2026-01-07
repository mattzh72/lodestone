import { BlockDefinition } from '../render/BlockDefinition.js'
import { BlockModel } from '../render/BlockModel.js'
import { TextureAtlas } from '../render/TextureAtlas.js'
import { upperPowerOfTwo } from '../math/index.js'
import type { Resources } from '../render/StructureRenderer.js'

export type DefaultPackUrls = {
	baseUrl: string,
	assetsJson: string,
	atlasPng: string,
	blockFlags: {
		opaqueTxt: string,
		transparentTxt: string,
		nonSelfCullingTxt: string,
		emissiveJson: string,
	},
}

type DefaultPackAssets = {
	blockstates: Record<string, unknown>,
	models: Record<string, unknown>,
	textures: Record<string, [number, number, number, number]>,
}

type BlockFlagsInput = {
	opaque?: Set<string>,
	transparent?: Set<string>,
	nonSelfCulling?: Set<string>,
	emissive?: Record<string, { intensity?: number, conditional?: string }>,
}

function normalizeId(id: unknown): string {
	if (!id) return ''
	if (typeof id === 'string') return id
	// Identifier objects and other types
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const anyId = id as any
	if (typeof anyId.toString === 'function') return anyId.toString()
	return String(id)
}

export function getBundledDefaultPackUrls(): DefaultPackUrls {
	// Compiled location is `lib/packs/default.js` so `../../assets/...` points at the package root `assets/`.
	const base = new URL(/* @vite-ignore */ '../../assets/default-pack/', import.meta.url).toString()
	return getDefaultPackUrls(base)
}

export function getDefaultPackUrls(baseUrl: string | URL): DefaultPackUrls {
	const base = (typeof baseUrl === "string" ? baseUrl : baseUrl.toString()).replace(/\/?$/, '/')
	return {
		baseUrl: base,
		assetsJson: new URL('assets.json', base).toString(),
		atlasPng: new URL('atlas.png', base).toString(),
		blockFlags: {
			opaqueTxt: new URL('block-flags/opaque.txt', base).toString(),
			transparentTxt: new URL('block-flags/transparent.txt', base).toString(),
			nonSelfCullingTxt: new URL('block-flags/non_self_culling.txt', base).toString(),
			emissiveJson: new URL('block-flags/emissive.json', base).toString(),
		},
	}
}

function parseBlockList(text: string): Set<string> {
	const ids = new Set<string>()
	const matches = text.match(/minecraft:[a-z0-9_]+/g) ?? []
	matches.forEach(match => ids.add(match))
	text
		.split(/\s+/)
		.map(token => token.trim())
		.filter(Boolean)
		.forEach(token => {
			const normalized = token.startsWith('minecraft:') ? token : `minecraft:${token}`
			ids.add(normalized)
		})
	return ids
}

async function decodeAtlasToImageData(atlasBlob: Blob): Promise<{ imageData: ImageData, atlasSize: number }> {
	const bitmap = typeof createImageBitmap === 'function' ? await createImageBitmap(atlasBlob) : null
	const w = bitmap?.width ?? 0
	const h = bitmap?.height ?? 0
	if (!bitmap || w <= 0 || h <= 0) {
		throw new Error('[lodestone] Unable to decode atlas.png: createImageBitmap unavailable or failed.')
	}

	const atlasSize = upperPowerOfTwo(Math.max(w, h))

	// Prefer OffscreenCanvas when available (works in modern browsers and many worker contexts).
	const canvas: OffscreenCanvas | HTMLCanvasElement =
		typeof OffscreenCanvas !== 'undefined'
			? new OffscreenCanvas(atlasSize, atlasSize)
			: (typeof document !== 'undefined'
				? Object.assign(document.createElement('canvas'), { width: atlasSize, height: atlasSize })
				: (() => { throw new Error('[lodestone] No canvas implementation available to decode atlas.png') })())

	// OffscreenCanvasRenderingContext2D exists in browsers; fall back to regular 2D context in DOM.
	const ctx = canvas.getContext('2d')
	if (!ctx) {
		throw new Error('[lodestone] Unable to create 2D canvas context to decode atlas.png')
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	;(ctx as any).drawImage(bitmap, 0, 0)
	const imageData = (ctx as CanvasRenderingContext2D).getImageData(0, 0, atlasSize, atlasSize)
	return { imageData, atlasSize }
}

export function createResourcesFromPack(input: {
	assets: DefaultPackAssets,
	atlas: { imageData: ImageData, atlasSize: number },
	flags?: BlockFlagsInput,
}): Resources {
	const { assets, atlas, flags } = input

	const blockDefinitions: Record<string, BlockDefinition> = {}
	Object.keys(assets.blockstates ?? {}).forEach(id => {
		blockDefinitions[`minecraft:${id}`] = BlockDefinition.fromJson((assets.blockstates as any)[id])
	})

	const blockModels: Record<string, BlockModel> = {}
	Object.keys(assets.models ?? {}).forEach(id => {
		blockModels[`minecraft:${id}`] = BlockModel.fromJson((assets.models as any)[id])
	})

	const blockModelAccessor = {
		getBlockModel(identifier: unknown) {
			return blockModels[normalizeId(identifier)] ?? null
		},
	}
	Object.values(blockModels).forEach(m => m.flatten(blockModelAccessor))

	const idMap: Record<string, [number, number, number, number]> = {}
	Object.keys(assets.textures ?? {}).forEach(id => {
		const [u, v, du, dv] = (assets.textures as any)[id] as [number, number, number, number]
		const dv2 = (du !== dv && id.startsWith('block/')) ? du : dv
		idMap[`minecraft:${id}`] = [
			u / atlas.atlasSize,
			v / atlas.atlasSize,
			(u + du) / atlas.atlasSize,
			(v + dv2) / atlas.atlasSize,
		]
	})
	const textureAtlas = new TextureAtlas(atlas.imageData, idMap)

	const opaqueBlocks = flags?.opaque ?? new Set<string>()
	const transparentBlocks = flags?.transparent ?? new Set<string>()
	const nonSelfCullingBlocks = flags?.nonSelfCulling ?? new Set<string>()
	const emissiveBlocks = flags?.emissive ?? {}

	return {
		getBlockDefinition(id) {
			return blockDefinitions[normalizeId(id)] ?? null
		},
		getBlockModel(id) {
			return blockModels[normalizeId(id)] ?? null
		},
		getTextureUV(id) {
			return textureAtlas.getTextureUV(id)
		},
		getTextureAtlas() {
			return textureAtlas.getTextureAtlas()
		},
		getPixelSize() {
			return textureAtlas.getPixelSize()
		},
		getBlockFlags(id) {
			const key = normalizeId(id)
			const isTransparent = transparentBlocks.has(key)
			const isExplicitOpaque = opaqueBlocks.has(key)
			const isOpaque = !isTransparent && (isExplicitOpaque || opaqueBlocks.size === 0)
			const isNonSelfCulling = nonSelfCullingBlocks.has(key)

			const emissiveData = emissiveBlocks[key]
			return {
				opaque: isOpaque,
				semi_transparent: isTransparent,
				self_culling: !isNonSelfCulling,
				emissive: !!emissiveData,
				emissiveIntensity: emissiveData?.intensity ?? 1.0,
				emissiveConditional: emissiveData?.conditional,
			}
		},
		getBlockProperties() {
			return null
		},
		getDefaultBlockProperties() {
			return null
		},
	}
}

export async function loadDefaultPackResources(options?: {
	baseUrl?: string | URL,
	fetch?: typeof globalThis.fetch,
}): Promise<{
	urls: DefaultPackUrls,
	assets: DefaultPackAssets,
	atlas: { imageData: ImageData, atlasSize: number },
	resources: Resources,
}> {
	const fetchFn = options?.fetch ?? globalThis.fetch
	if (!fetchFn) {
		throw new Error('[lodestone] fetch is not available; pass options.fetch')
	}

	const urls = options?.baseUrl ? getDefaultPackUrls(options.baseUrl) : getBundledDefaultPackUrls()

	const [assetsRes, atlasRes, opaqueRes, transparentRes, nonSelfCullingRes, emissiveRes] = await Promise.all([
		fetchFn(urls.assetsJson),
		fetchFn(urls.atlasPng),
		fetchFn(urls.blockFlags.opaqueTxt),
		fetchFn(urls.blockFlags.transparentTxt),
		fetchFn(urls.blockFlags.nonSelfCullingTxt),
		fetchFn(urls.blockFlags.emissiveJson),
	])

	if (!assetsRes.ok) throw new Error(`[lodestone] Failed to fetch assets.json: ${assetsRes.status} ${assetsRes.statusText}`)
	if (!atlasRes.ok) throw new Error(`[lodestone] Failed to fetch atlas.png: ${atlasRes.status} ${atlasRes.statusText}`)
	if (!opaqueRes.ok) throw new Error(`[lodestone] Failed to fetch opaque.txt: ${opaqueRes.status} ${opaqueRes.statusText}`)
	if (!transparentRes.ok) throw new Error(`[lodestone] Failed to fetch transparent.txt: ${transparentRes.status} ${transparentRes.statusText}`)
	if (!nonSelfCullingRes.ok) throw new Error(`[lodestone] Failed to fetch non_self_culling.txt: ${nonSelfCullingRes.status} ${nonSelfCullingRes.statusText}`)
	if (!emissiveRes.ok) throw new Error(`[lodestone] Failed to fetch emissive.json: ${emissiveRes.status} ${emissiveRes.statusText}`)

	const assets = await assetsRes.json() as DefaultPackAssets
	const atlasBlob = await atlasRes.blob()
	const atlas = await decodeAtlasToImageData(atlasBlob)

	const flags: BlockFlagsInput = {
		opaque: parseBlockList(await opaqueRes.text()),
		transparent: parseBlockList(await transparentRes.text()),
		nonSelfCulling: parseBlockList(await nonSelfCullingRes.text()),
		emissive: await emissiveRes.json(),
	}

	const resources = createResourcesFromPack({ assets, atlas, flags })

	return { urls, assets, atlas, resources }
}
