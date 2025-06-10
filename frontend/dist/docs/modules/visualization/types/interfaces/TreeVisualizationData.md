[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/visualization/types](../README.md) / TreeVisualizationData

# Interface: TreeVisualizationData

Defined in: [frontend/src/modules/visualization/types.ts:243](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L243)

## Properties

### nodes

> **nodes**: `object`[]

Defined in: [frontend/src/modules/visualization/types.ts:244](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L244)

#### id

> **id**: `string`

#### label

> **label**: `string`

#### value

> **value**: `number`

#### level

> **level**: `number`

#### parentId?

> `optional` **parentId**: `string`

#### status

> **status**: `"active"` \| `"completed"` \| `"locked"` \| `"mastered"`

#### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

---

### connections

> **connections**: `object`[]

Defined in: [frontend/src/modules/visualization/types.ts:253](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L253)

#### from

> **from**: `string`

#### to

> **to**: `string`

#### type

> **type**: `"prerequisite"` \| `"progression"` \| `"alternative"`
