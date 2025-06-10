[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/visualization/types](../README.md) / VisualizationEventData

# Interface: VisualizationEventData

Defined in: [frontend/src/modules/visualization/types.ts:330](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L330)

## Properties

### chartRendered

> **chartRendered**: `object`

Defined in: [frontend/src/modules/visualization/types.ts:331](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L331)

#### chartId

> **chartId**: `string`

#### type

> **type**: [`ChartType`](../type-aliases/ChartType.md)

#### renderTime

> **renderTime**: `number`

#### dataPoints

> **dataPoints**: `number`

---

### chartExported

> **chartExported**: `object`

Defined in: [frontend/src/modules/visualization/types.ts:337](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L337)

#### chartId

> **chartId**: `string`

#### format

> **format**: `string`

#### size

> **size**: `number`

#### success

> **success**: `boolean`

---

### chartInteraction

> **chartInteraction**: [`ChartInteractionEvent`](ChartInteractionEvent.md)

Defined in: [frontend/src/modules/visualization/types.ts:343](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L343)

---

### dataUpdated

> **dataUpdated**: `object`

Defined in: [frontend/src/modules/visualization/types.ts:344](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L344)

#### chartId

> **chartId**: `string`

#### source

> **source**: `string`

#### recordsUpdated

> **recordsUpdated**: `number`

#### timestamp

> **timestamp**: `number`

---

### layoutChanged

> **layoutChanged**: `object`

Defined in: [frontend/src/modules/visualization/types.ts:350](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L350)

#### dashboardId

> **dashboardId**: `string`

#### changes

> **changes**: `string`[]

#### timestamp

> **timestamp**: `number`

---

### errorOccurred

> **errorOccurred**: [`VisualizationError`](VisualizationError.md)

Defined in: [frontend/src/modules/visualization/types.ts:355](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L355)
