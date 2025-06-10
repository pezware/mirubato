[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/curriculum/types](../README.md) / LearningPath

# Interface: LearningPath

Defined in: [frontend/src/modules/curriculum/types.ts:26](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L26)

## Extends

- [`UserScopedEntity`](../../../core/sharedTypes/interfaces/UserScopedEntity.md)

## Properties

### id

> **id**: `string`

Defined in: [frontend/src/modules/core/sharedTypes.ts:13](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/sharedTypes.ts#L13)

#### Inherited from

[`UserScopedEntity`](../../../core/sharedTypes/interfaces/UserScopedEntity.md).[`id`](../../../core/sharedTypes/interfaces/UserScopedEntity.md#id)

---

### userId

> **userId**: `string`

Defined in: [frontend/src/modules/core/sharedTypes.ts:20](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/sharedTypes.ts#L20)

#### Inherited from

[`UserScopedEntity`](../../../core/sharedTypes/interfaces/UserScopedEntity.md).[`userId`](../../../core/sharedTypes/interfaces/UserScopedEntity.md#userid)

---

### name

> **name**: `string`

Defined in: [frontend/src/modules/curriculum/types.ts:27](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L27)

---

### description

> **description**: `string`

Defined in: [frontend/src/modules/curriculum/types.ts:28](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L28)

---

### instrument

> **instrument**: [`Instrument`](../../../core/enumerations/Instrument.md)

Defined in: [frontend/src/modules/curriculum/types.ts:29](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L29)

---

### skillLevel

> **skillLevel**: [`SkillLevel`](../../../core/sharedTypes/enumerations/SkillLevel.md)

Defined in: [frontend/src/modules/curriculum/types.ts:30](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L30)

---

### phases

> **phases**: [`Phase`](Phase.md)[]

Defined in: [frontend/src/modules/curriculum/types.ts:31](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L31)

---

### currentPhaseId

> **currentPhaseId**: `string`

Defined in: [frontend/src/modules/curriculum/types.ts:32](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L32)

---

### progress

> **progress**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:33](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L33)

---

### createdAt

> **createdAt**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:34](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L34)

#### Overrides

[`UserScopedEntity`](../../../core/sharedTypes/interfaces/UserScopedEntity.md).[`createdAt`](../../../core/sharedTypes/interfaces/UserScopedEntity.md#createdat)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:35](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L35)

#### Overrides

[`UserScopedEntity`](../../../core/sharedTypes/interfaces/UserScopedEntity.md).[`updatedAt`](../../../core/sharedTypes/interfaces/UserScopedEntity.md#updatedat)

---

### completedAt?

> `optional` **completedAt**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:36](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L36)

---

### metadata?

> `optional` **metadata**: `object`

Defined in: [frontend/src/modules/curriculum/types.ts:37](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L37)

#### estimatedDuration

> **estimatedDuration**: `number`

#### prerequisiteSkills?

> `optional` **prerequisiteSkills**: `string`[]

#### learningOutcomes?

> `optional` **learningOutcomes**: `string`[]
