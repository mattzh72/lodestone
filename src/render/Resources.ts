import type { Identifier } from '../core/index.js'
import type { BlockDefinitionProvider } from './BlockDefinition.js'
import type { BlockModelProvider } from './BlockModel.js'
import type { TextureAtlasProvider } from './TextureAtlas.js'

export type BlockFlags = {
	opaque?: boolean,
	semi_transparent?: boolean,
	self_culling?: boolean,
	emissive?: boolean,
	emissiveIntensity?: number,
	emissiveConditional?: string,
}

export interface BlockFlagsProvider {
	getBlockFlags(id: Identifier): BlockFlags | null
}

export interface BlockPropertiesProvider {
	getBlockProperties(id: Identifier): Record<string, string[]> | null
	getDefaultBlockProperties(id: Identifier): Record<string, string> | null
}

export interface Resources extends BlockDefinitionProvider, BlockModelProvider, TextureAtlasProvider, BlockFlagsProvider, BlockPropertiesProvider {}
