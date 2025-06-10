[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/visualization/types](../README.md) / ChartInteractionEvent

# Interface: ChartInteractionEvent

Defined in: [frontend/src/modules/visualization/types.ts:131](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L131)

## Properties

### chartId

> **chartId**: `string`

Defined in: [frontend/src/modules/visualization/types.ts:132](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L132)

---

### type

> **type**: `"click"` \| `"select"` \| `"hover"` \| `"zoom"` \| `"pan"`

Defined in: [frontend/src/modules/visualization/types.ts:133](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L133)

---

### data

> **data**: `object`

Defined in: [frontend/src/modules/visualization/types.ts:134](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L134)

#### point?

> `optional` **point**: [`DataPoint`](DataPoint.md)

#### dataset?

> `optional` **dataset**: `string`

#### coordinates?

> `optional` **coordinates**: `object`

##### coordinates.x

> **x**: `number`

##### coordinates.y

> **y**: `number`

#### zoomLevel?

> `optional` **zoomLevel**: `number`

#### selection?

> `optional` **selection**: [`DataPoint`](DataPoint.md)[]

---

### timestamp

> **timestamp**: `number`

Defined in: [frontend/src/modules/visualization/types.ts:141](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L141)
