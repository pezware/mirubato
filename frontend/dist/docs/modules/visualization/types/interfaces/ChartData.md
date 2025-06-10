[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/visualization/types](../README.md) / ChartData

# Interface: ChartData

Defined in: [frontend/src/modules/visualization/types.ts:76](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L76)

## Properties

### id

> **id**: `string`

Defined in: [frontend/src/modules/visualization/types.ts:77](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L77)

---

### type

> **type**: [`ChartType`](../type-aliases/ChartType.md)

Defined in: [frontend/src/modules/visualization/types.ts:78](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L78)

---

### title

> **title**: `string`

Defined in: [frontend/src/modules/visualization/types.ts:79](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L79)

---

### subtitle?

> `optional` **subtitle**: `string`

Defined in: [frontend/src/modules/visualization/types.ts:80](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L80)

---

### datasets

> **datasets**: [`ChartDataset`](ChartDataset.md)[]

Defined in: [frontend/src/modules/visualization/types.ts:81](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L81)

---

### labels?

> `optional` **labels**: `string`[]

Defined in: [frontend/src/modules/visualization/types.ts:82](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L82)

---

### metadata

> **metadata**: `object`

Defined in: [frontend/src/modules/visualization/types.ts:83](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L83)

#### lastUpdated

> **lastUpdated**: `number`

#### dataSource

> **dataSource**: `string`

#### filterApplied?

> `optional` **filterApplied**: `string`

#### aggregationPeriod?

> `optional` **aggregationPeriod**: `"month"` \| `"week"` \| `"year"` \| `"day"`
