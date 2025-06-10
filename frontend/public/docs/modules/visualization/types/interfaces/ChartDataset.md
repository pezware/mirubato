[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/visualization/types](../README.md) / ChartDataset

# Interface: ChartDataset

Defined in: [frontend/src/modules/visualization/types.ts:91](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L91)

## Properties

### id

> **id**: `string`

Defined in: [frontend/src/modules/visualization/types.ts:92](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L92)

---

### label

> **label**: `string`

Defined in: [frontend/src/modules/visualization/types.ts:93](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L93)

---

### data

> **data**: [`DataPoint`](DataPoint.md)[]

Defined in: [frontend/src/modules/visualization/types.ts:94](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L94)

---

### styling?

> `optional` **styling**: `object`

Defined in: [frontend/src/modules/visualization/types.ts:95](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L95)

#### color

> **color**: `string`

#### fillColor?

> `optional` **fillColor**: `string`

#### borderWidth?

> `optional` **borderWidth**: `number`

#### pointStyle?

> `optional` **pointStyle**: `"triangle"` \| `"square"` \| `"circle"`

#### lineStyle?

> `optional` **lineStyle**: `"solid"` \| `"dashed"` \| `"dotted"`

---

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [frontend/src/modules/visualization/types.ts:102](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L102)
