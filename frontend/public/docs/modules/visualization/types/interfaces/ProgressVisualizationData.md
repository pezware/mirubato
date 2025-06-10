[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/visualization/types](../README.md) / ProgressVisualizationData

# Interface: ProgressVisualizationData

Defined in: [frontend/src/modules/visualization/types.ts:176](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L176)

## Properties

### userId

> **userId**: `string`

Defined in: [frontend/src/modules/visualization/types.ts:177](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L177)

---

### timeRange

> **timeRange**: `object`

Defined in: [frontend/src/modules/visualization/types.ts:178](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L178)

#### start

> **start**: `number`

#### end

> **end**: `number`

#### period

> **period**: `"month"` \| `"week"` \| `"day"`

---

### practiceTime

> **practiceTime**: `object`[]

Defined in: [frontend/src/modules/visualization/types.ts:183](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L183)

#### date

> **date**: `string`

#### minutes

> **minutes**: `number`

#### quality

> **quality**: `number`

---

### accuracy

> **accuracy**: `object`[]

Defined in: [frontend/src/modules/visualization/types.ts:188](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L188)

#### date

> **date**: `string`

#### score

> **score**: `number`

#### trend

> **trend**: `"improving"` \| `"stable"` \| `"declining"`

---

### pieces

> **pieces**: `object`[]

Defined in: [frontend/src/modules/visualization/types.ts:193](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L193)

#### id

> **id**: `string`

#### title

> **title**: `string`

#### progress

> **progress**: `number`

#### lastPracticed

> **lastPracticed**: `number`

#### readiness

> **readiness**: `number`

---

### skills

> **skills**: `object`[]

Defined in: [frontend/src/modules/visualization/types.ts:200](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/types.ts#L200)

#### name

> **name**: `string`

#### current

> **current**: `number`

#### target

> **target**: `number`

#### history

> **history**: `object`[]
