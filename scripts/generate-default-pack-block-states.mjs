#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS_PATH = path.join(ROOT, 'assets', 'default-pack', 'assets.json')
const PACKAGE_PATH = path.join(ROOT, 'package.json')
const OUTPUT_PATH = path.join(ROOT, 'docs', 'default-pack-block-states.md')

const DIRECTIONS_4 = ['north', 'east', 'south', 'west']
const DIRECTIONS_6 = ['down', 'up', 'north', 'east', 'south', 'west']
const NUMBER_0_15 = Array.from({ length: 16 }, (_, index) => String(index))
const BOOLEAN_VALUES = ['false', 'true']

const DYE_COLORS = [
  'white',
  'orange',
  'magenta',
  'light_blue',
  'yellow',
  'lime',
  'pink',
  'gray',
  'light_gray',
  'cyan',
  'purple',
  'blue',
  'brown',
  'green',
  'red',
  'black',
]

const WOOD_TYPES = [
  'oak',
  'spruce',
  'birch',
  'jungle',
  'acacia',
  'dark_oak',
  'mangrove',
  'cherry',
  'bamboo',
  'crimson',
  'warped',
]

const SPECIAL_GROUPS = [
  {
    title: 'Chest-like special renderers',
    ids: ['minecraft:chest', 'minecraft:ender_chest', 'minecraft:trapped_chest'],
    properties: {
      facing: DIRECTIONS_4,
    },
    defaults: {
      facing: 'south',
    },
    notes: [
      'Renders a single chest model. Double-chest `type` and neighbor joining are not read.',
    ],
  },
  {
    title: 'Standing skull special renderers',
    ids: [
      'minecraft:skeleton_skull',
      'minecraft:wither_skeleton_skull',
      'minecraft:zombie_head',
      'minecraft:creeper_head',
      'minecraft:dragon_head',
      'minecraft:piglin_head',
      'minecraft:player_head',
    ],
    properties: {
      rotation: NUMBER_0_15,
    },
    defaults: {
      rotation: '0',
    },
    notes: [
      '`rotation` is parsed as an integer and mapped around the vertical axis.',
    ],
  },
  {
    title: 'Standing sign special renderers',
    ids: WOOD_TYPES.map(type => `minecraft:${type}_sign`),
    properties: {
      rotation: NUMBER_0_15,
    },
    defaults: {
      rotation: '0',
    },
  },
  {
    title: 'Wall sign special renderers',
    ids: WOOD_TYPES.map(type => `minecraft:${type}_wall_sign`),
    properties: {
      facing: DIRECTIONS_4,
    },
    defaults: {
      facing: 'south',
    },
  },
  {
    title: 'Hanging sign special renderers',
    ids: WOOD_TYPES.map(type => `minecraft:${type}_hanging_sign`),
    properties: {
      attached: BOOLEAN_VALUES,
      rotation: NUMBER_0_15,
    },
    defaults: {
      attached: 'false',
      rotation: '0',
    },
  },
  {
    title: 'Wall hanging sign special renderers',
    ids: WOOD_TYPES.map(type => `minecraft:${type}_wall_hanging_sign`),
    properties: {
      facing: DIRECTIONS_4,
    },
    defaults: {
      facing: 'south',
    },
  },
  {
    title: 'Colored shulker box special renderers',
    ids: DYE_COLORS.map(color => `minecraft:${color}_shulker_box`),
    properties: {
      facing: DIRECTIONS_6,
    },
    defaults: {
      facing: 'up',
    },
    notes: [
      '`minecraft:shulker_box` is rendered by the default-pack model and does not use this colored special renderer.',
    ],
  },
  {
    title: 'Bed special renderers',
    ids: DYE_COLORS.map(color => `minecraft:${color}_bed`),
    properties: {
      facing: DIRECTIONS_4,
      part: ['foot', 'head'],
    },
    defaults: {
      facing: 'south',
      part: 'head',
    },
  },
  {
    title: 'Banner special renderers',
    ids: DYE_COLORS.map(color => `minecraft:${color}_banner`),
    properties: {
      rotation: NUMBER_0_15,
    },
    defaults: {
      rotation: '0',
    },
    notes: [
      'The optional block entity `patterns` list affects banner texture composition.',
    ],
  },
  {
    title: 'Wall banner special renderers',
    ids: DYE_COLORS.map(color => `minecraft:${color}_wall_banner`),
    properties: {
      facing: DIRECTIONS_4,
    },
    defaults: {
      facing: 'south',
    },
    notes: [
      'The optional block entity `patterns` list affects banner texture composition.',
    ],
  },
  {
    title: 'Liquid special renderers',
    ids: ['minecraft:water', 'minecraft:lava'],
    properties: {
      level: NUMBER_0_15,
    },
    defaults: {
      level: '0',
    },
    notes: [
      'Levels `0` through `7` render descending heights. Levels `8` through `15` render as full-height source-like liquid in the current renderer.',
    ],
  },
]

const GENERIC_RENDERER_PROPERTIES = [
  {
    property: 'waterlogged',
    values: BOOLEAN_VALUES,
    defaultValue: 'false',
    notes: [
      'For non-water and non-lava blocks, `waterlogged=true` renders a water overlay and changes water culling behavior.',
      'Water, lava, bubble columns, kelp, kelp plants, seagrass, and tall seagrass are also treated as waterlogged by code.',
    ],
  },
]

const VALUE_ORDER = new Map([
  ...BOOLEAN_VALUES,
  'none',
  'low',
  'tall',
  'bottom',
  'top',
  'lower',
  'upper',
  'foot',
  'head',
  'single',
  'left',
  'right',
  'straight',
  'inner_left',
  'inner_right',
  'outer_left',
  'outer_right',
  ...DIRECTIONS_6,
  ...DIRECTIONS_4,
  'x',
  'y',
  'z',
].map((value, index) => [value, index]))

function usage() {
  return `Usage:
  node scripts/generate-default-pack-block-states.mjs [--check]

Generates docs/default-pack-block-states.md from assets/default-pack/assets.json.
`
}

function parseArgs(argv) {
  const options = {
    check: false,
    help: false,
  }

  for (const arg of argv) {
    if (arg === '--check') {
      options.check = true
    } else if (arg === '-h' || arg === '--help') {
      options.help = true
    } else {
      throw new Error(`Unexpected argument: ${arg}`)
    }
  }

  return options
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n').replace(/\s+$/u, '') + '\n'
}

function addValue(map, property, rawValue) {
  if (!property || rawValue === undefined || rawValue === null) return
  if (!map.has(property)) map.set(property, new Set())
  String(rawValue).split('|').filter(Boolean).forEach(value => map.get(property).add(value))
}

function parseVariantKey(key, map) {
  if (!key) return

  for (const part of key.split(',')) {
    const equalsIndex = part.indexOf('=')
    if (equalsIndex <= 0) continue
    addValue(map, part.slice(0, equalsIndex), part.slice(equalsIndex + 1))
  }
}

function walkMultipartCondition(condition, map) {
  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) return

  for (const [key, value] of Object.entries(condition)) {
    if (key === 'OR' || key === 'AND') {
      for (const nested of Array.isArray(value) ? value : []) {
        walkMultipartCondition(nested, map)
      }
    } else if (value && typeof value === 'object') {
      walkMultipartCondition(value, map)
    } else {
      addValue(map, key, value)
    }
  }
}

function sortedValues(values) {
  return [...values].sort((a, b) => {
    const aNumber = Number(a)
    const bNumber = Number(b)
    if (Number.isInteger(aNumber) && Number.isInteger(bNumber)) return aNumber - bNumber

    const aOrder = VALUE_ORDER.get(a)
    const bOrder = VALUE_ORDER.get(b)
    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder
    if (aOrder !== undefined) return -1
    if (bOrder !== undefined) return 1

    return a.localeCompare(b, 'en', { numeric: true })
  })
}

function addInferredMultipartValues(blockId, property, observedValues) {
  const values = new Set(observedValues)
  const inferred = new Set()

  if (values.size === 1 && values.has('true')) {
    values.add('false')
    inferred.add('false')
  } else if (values.size === 1 && values.has('false')) {
    values.add('true')
    inferred.add('true')
  }

  if (
    blockId.endsWith('_wall')
    && DIRECTIONS_4.includes(property)
    && values.has('low')
    && values.has('tall')
    && !values.has('none')
  ) {
    values.add('none')
    inferred.add('none')
  }

  return {
    values,
    inferred,
  }
}

function collectBlockstate(blockId, blockstate) {
  const observed = new Map()
  const format = blockstate.variants ? 'variants' : blockstate.multipart ? 'multipart' : 'unknown'
  const variantKeys = blockstate.variants ? Object.keys(blockstate.variants).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) : []

  if (blockstate.variants) {
    for (const key of variantKeys) {
      parseVariantKey(key, observed)
    }
  }

  if (blockstate.multipart) {
    for (const part of blockstate.multipart) {
      walkMultipartCondition(part.when, observed)
    }
  }

  const properties = new Map()
  for (const [property, values] of [...observed].sort(([a], [b]) => a.localeCompare(b))) {
    const augmented = format === 'multipart'
      ? addInferredMultipartValues(blockId, property, values)
      : { values, inferred: new Set() }

    properties.set(property, {
      values: sortedValues(augmented.values),
      observed: sortedValues(values),
      inferred: sortedValues(augmented.inferred),
    })
  }

  return {
    format,
    properties,
    variantKeys,
  }
}

function createSpecialIndex() {
  const byId = new Map()

  for (const group of SPECIAL_GROUPS) {
    for (const id of group.ids) {
      if (!byId.has(id)) byId.set(id, [])
      byId.get(id).push(group)
    }
  }

  return byId
}

function addToPropertyIndex(index, property, values, blockId, source) {
  if (!index.has(property)) {
    index.set(property, {
      values: new Set(),
      blocks: new Set(),
      sources: new Set(),
    })
  }

  const entry = index.get(property)
  values.forEach(value => entry.values.add(value))
  entry.blocks.add(blockId)
  entry.sources.add(source)
}

function backtick(value) {
  return `\`${value}\``
}

function formatValues(values) {
  return values.map(backtick).join(' | ')
}

function formatPropertyLine(property, entry) {
  let line = `- ${backtick(property)}: ${formatValues(entry.values)}`
  if (entry.inferred.length > 0) {
    line += ` (observed: ${formatValues(entry.observed)}; inferred absent/off: ${formatValues(entry.inferred)})`
  }
  return line
}

function renderSpecialProperties(group) {
  const lines = []

  for (const [property, values] of Object.entries(group.properties)) {
    const defaultValue = group.defaults?.[property]
    const suffix = defaultValue === undefined ? '' : `; default ${backtick(defaultValue)}`
    lines.push(`- ${backtick(property)}: ${formatValues(values)}${suffix}`)
  }

  return lines
}

function renderSpecialGroup(group) {
  const lines = [
    `### ${group.title}`,
    '',
    `Block ids: ${group.ids.map(backtick).join(', ')}`,
    '',
    'Properties:',
    ...renderSpecialProperties(group),
  ]

  if (group.notes?.length > 0) {
    lines.push('', 'Notes:')
    group.notes.forEach(note => lines.push(`- ${note}`))
  }

  lines.push('')
  return lines
}

function renderBlockReference(blockId, defaultEntry, specialGroups) {
  const lines = [
    `### ${backtick(blockId)}`,
    '',
  ]

  if (defaultEntry) {
    lines.push(`Default-pack blockstate format: ${backtick(defaultEntry.format)}`, '')

    if (defaultEntry.properties.size === 0) {
      lines.push('Default-pack state values: none observed.', '')
    } else {
      lines.push('Default-pack state values:')
      for (const [property, entry] of defaultEntry.properties) {
        lines.push(formatPropertyLine(property, entry))
      }
      lines.push('')
    }

    if (defaultEntry.variantKeys.length > 0) {
      lines.push(`Exact rendered variant keys (${defaultEntry.variantKeys.length}):`)
      defaultEntry.variantKeys.forEach(key => lines.push(`- ${backtick(key || '(default)')}`))
      lines.push('')
    } else if (defaultEntry.format === 'multipart') {
      lines.push('Multipart note: listed values come from renderer conditions, not from complete variant combinations. Missing, opposite, or unmatched values usually render the corresponding part as absent/default.', '')
    }
  } else {
    lines.push('Default-pack blockstate format: not present in bundled default pack.', '')
  }

  if (specialGroups.length > 0) {
    lines.push('Special renderer state values:')
    for (const group of specialGroups) {
      for (const line of renderSpecialProperties(group)) {
        lines.push(line)
      }
    }
    lines.push('')

    const notes = specialGroups.flatMap(group => group.notes ?? [])
    if (notes.length > 0) {
      lines.push('Special renderer notes:')
      notes.forEach(note => lines.push(`- ${note}`))
      lines.push('')
    }
  }

  return lines
}

function generateMarkdown({ assets, assetsText, packageJson }) {
  const defaultEntries = new Map()
  const specialById = createSpecialIndex()
  const propertyIndex = new Map()
  let variantBlockCount = 0
  let multipartBlockCount = 0
  let variantKeyCount = 0

  for (const [rawId, blockstate] of Object.entries(assets.blockstates ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const blockId = `minecraft:${rawId}`
    const entry = collectBlockstate(rawId, blockstate)
    defaultEntries.set(blockId, entry)

    if (entry.format === 'variants') {
      variantBlockCount += 1
      variantKeyCount += entry.variantKeys.length
    } else if (entry.format === 'multipart') {
      multipartBlockCount += 1
    }

    for (const [property, propertyEntry] of entry.properties) {
      addToPropertyIndex(propertyIndex, property, propertyEntry.values, blockId, 'default-pack')
    }
  }

  for (const [blockId, groups] of specialById) {
    for (const group of groups) {
      for (const [property, values] of Object.entries(group.properties)) {
        addToPropertyIndex(propertyIndex, property, values, blockId, 'special-renderer')
      }
    }
  }

  const allBlockIds = new Set([...defaultEntries.keys(), ...specialById.keys()])
  for (const blockId of defaultEntries.keys()) {
    for (const generic of GENERIC_RENDERER_PROPERTIES) {
      addToPropertyIndex(propertyIndex, generic.property, generic.values, blockId, 'generic-renderer')
    }
  }

  const lines = [
    '# Default Pack Block States',
    '',
    '<!--',
    'Generated by scripts/generate-default-pack-block-states.mjs.',
    'Do not edit this file directly.',
    '-->',
    '',
    `These docs describe Lodestone ${backtick(packageJson.version)}.`,
    '',
    'This is a support reference for the block ids and block-state values understood by Lodestone\'s bundled default renderer data. It is not a full Minecraft version registry and Lodestone does not validate block ids or properties when serializing structure NBT.',
    '',
    'Use this file when you need to choose block ids and state values that the Lodestone preview is expected to render. Use `updateBlockStates()` documentation for values Lodestone can derive automatically.',
    '',
    '## Summary',
    '',
    `- Default-pack block ids: ${defaultEntries.size}`,
    `- Variant blockstate definitions: ${variantBlockCount}`,
    `- Multipart blockstate definitions: ${multipartBlockCount}`,
    `- Exact rendered variant keys: ${variantKeyCount}`,
    `- Special renderer groups: ${SPECIAL_GROUPS.length}`,
    `- Generic renderer properties: ${GENERIC_RENDERER_PROPERTIES.map(item => backtick(item.property)).join(', ')}`,
    `- Source asset SHA-256: ${backtick(sha256(assetsText))}`,
    '',
    '## How To Read This',
    '',
    '- Block ids are shown with the `minecraft:` namespace, even though the packed asset keys omit it.',
    '- `variants` blocks list exact rendered variant keys from the default pack.',
    '- `multipart` blocks list values found in renderer conditions. Inferred `false` or `none` values mean the corresponding model part is absent/default in the renderer.',
    '- Special renderer values are read by Lodestone code in addition to default-pack blockstate JSON.',
    '- The generic `waterlogged` property is accepted by the renderer for any stored block state, but it is not listed in vanilla blockstate JSON for every block.',
    '- Lodestone stores arbitrary string properties. Values outside this reference can still be written to NBT, but they may not affect preview rendering.',
    '',
    '## Property Value Index',
    '',
  ]

  for (const [property, entry] of [...propertyIndex].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`- ${backtick(property)} (${entry.blocks.size} blocks; ${[...entry.sources].sort().join(', ')}): ${formatValues(sortedValues(entry.values))}`)
  }

  lines.push('', '## Generic Renderer Properties', '')

  for (const generic of GENERIC_RENDERER_PROPERTIES) {
    lines.push(`### ${backtick(generic.property)}`, '')
    lines.push(`Values: ${formatValues(generic.values)}`)
    lines.push(`Default: ${backtick(generic.defaultValue)}`)
    lines.push('')
    lines.push('Notes:')
    generic.notes.forEach(note => lines.push(`- ${note}`))
    lines.push('')
  }

  lines.push('## Special Renderer State Support', '')
  lines.push('These properties are read by `src/render/SpecialRenderer.ts`. They may appear on blocks whose default-pack blockstate JSON lists no properties because the model is generated in code.', '')

  for (const group of SPECIAL_GROUPS) {
    lines.push(...renderSpecialGroup(group))
  }

  lines.push('## Block Reference', '')

  for (const blockId of [...allBlockIds].sort((a, b) => a.localeCompare(b))) {
    lines.push(...renderBlockReference(blockId, defaultEntries.get(blockId), specialById.get(blockId) ?? []))
  }

  return normalizeText(lines.join('\n'))
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const assetsText = await fs.readFile(ASSETS_PATH, 'utf8')
  const assets = JSON.parse(assetsText)
  const packageJson = await readJson(PACKAGE_PATH)
  const markdown = generateMarkdown({ assets, assetsText, packageJson })

  if (options.check) {
    const existing = normalizeText(await fs.readFile(OUTPUT_PATH, 'utf8'))
    if (existing !== markdown) {
      throw new Error(`${path.relative(ROOT, OUTPUT_PATH)} is out of date. Run npm run docs:block-states.`)
    }
    console.log(`${path.relative(ROOT, OUTPUT_PATH)} is up to date`)
    return
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.writeFile(OUTPUT_PATH, markdown)
  console.log(`Generated ${path.relative(ROOT, OUTPUT_PATH)}`)
}

main().catch(error => {
  console.error(`generate-default-pack-block-states: ${error.message}`)
  process.exitCode = 1
})
