[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/visualization/types](../README.md) / HeatmapData

# Interface: HeatmapData

Defined in: [frontend/src/modules/visualization/types.ts:208](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L208)

## Properties

### dates

> **dates**: `string`[]

Defined in: [frontend/src/modules/visualization/types.ts:209](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L209)

---

### values

> **values**: `object`[]

Defined in: [frontend/src/modules/visualization/types.ts:210](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L210)

#### date

> **date**: `string`

#### value

> **value**: `number`

#### intensity

> **intensity**: `"max"` \| `"none"` \| `"medium"` \| `"low"` \| `"high"`

#### details?

> `optional` **details**: `object`

##### details.practiceTime

> **practiceTime**: `number`

##### details.sessionsCount

> **sessionsCount**: `number`

##### details.piecesWorked

> **piecesWorked**: `number`

---

### stats

> **stats**: `object`

Defined in: [frontend/src/modules/visualization/types.ts:220](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L220)

#### totalDays

> **totalDays**: `number`

#### activeDays

> **activeDays**: `number`

#### streak

> **streak**: `number`

#### averageDaily

> **averageDaily**: `number`
