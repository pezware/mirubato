[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/visualization/types](../README.md) / ChartSpecification

# Interface: ChartSpecification

Defined in: [frontend/src/modules/visualization/types.ts:19](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L19)

## Properties

### id

> **id**: `string`

Defined in: [frontend/src/modules/visualization/types.ts:20](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L20)

---

### type

> **type**: [`ChartType`](../type-aliases/ChartType.md)

Defined in: [frontend/src/modules/visualization/types.ts:21](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L21)

---

### dataSource

> **dataSource**: `string`

Defined in: [frontend/src/modules/visualization/types.ts:22](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L22)

---

### updateFrequency

> **updateFrequency**: `"session"` \| `"daily"` \| `"realtime"`

Defined in: [frontend/src/modules/visualization/types.ts:23](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L23)

---

### dimensions

> **dimensions**: `object`

Defined in: [frontend/src/modules/visualization/types.ts:24](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L24)

#### width?

> `optional` **width**: `number` \| `"auto"`

#### height?

> `optional` **height**: `number` \| `"auto"`

#### aspectRatio?

> `optional` **aspectRatio**: `number`

---

### interactivity

> **interactivity**: `object`

Defined in: [frontend/src/modules/visualization/types.ts:29](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L29)

#### zoom

> **zoom**: `boolean`

#### pan

> **pan**: `boolean`

#### tooltips

> **tooltips**: `boolean`

#### legend

> **legend**: `boolean`

#### onClick?

> `optional` **onClick**: `boolean`

---

### styling?

> `optional` **styling**: [`ChartStyling`](ChartStyling.md)

Defined in: [frontend/src/modules/visualization/types.ts:36](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L36)
