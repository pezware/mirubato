[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/practice/types](../README.md) / PracticeSession

# Interface: PracticeSession

Defined in: [frontend/src/modules/practice/types.ts:11](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/types.ts#L11)

## Extends

- [`UserScopedEntity`](../../../core/sharedTypes/interfaces/UserScopedEntity.md)

## Properties

### id

> **id**: `string`

Defined in: [frontend/src/modules/core/sharedTypes.ts:13](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/sharedTypes.ts#L13)

#### Inherited from

[`UserScopedEntity`](../../../core/sharedTypes/interfaces/UserScopedEntity.md).[`id`](../../../core/sharedTypes/interfaces/UserScopedEntity.md#id)

---

### createdAt

> **createdAt**: `number`

Defined in: [frontend/src/modules/core/sharedTypes.ts:14](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/sharedTypes.ts#L14)

#### Inherited from

[`UserScopedEntity`](../../../core/sharedTypes/interfaces/UserScopedEntity.md).[`createdAt`](../../../core/sharedTypes/interfaces/UserScopedEntity.md#createdat)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [frontend/src/modules/core/sharedTypes.ts:15](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/sharedTypes.ts#L15)

#### Inherited from

[`UserScopedEntity`](../../../core/sharedTypes/interfaces/UserScopedEntity.md).[`updatedAt`](../../../core/sharedTypes/interfaces/UserScopedEntity.md#updatedat)

---

### userId

> **userId**: `string`

Defined in: [frontend/src/modules/core/sharedTypes.ts:20](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/sharedTypes.ts#L20)

#### Inherited from

[`UserScopedEntity`](../../../core/sharedTypes/interfaces/UserScopedEntity.md).[`userId`](../../../core/sharedTypes/interfaces/UserScopedEntity.md#userid)

---

### startTime

> **startTime**: `number`

Defined in: [frontend/src/modules/practice/types.ts:12](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/types.ts#L12)

---

### endTime?

> `optional` **endTime**: `number`

Defined in: [frontend/src/modules/practice/types.ts:13](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/types.ts#L13)

---

### sheetMusicId

> **sheetMusicId**: `string`

Defined in: [frontend/src/modules/practice/types.ts:14](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/types.ts#L14)

---

### sheetMusicTitle

> **sheetMusicTitle**: `string`

Defined in: [frontend/src/modules/practice/types.ts:15](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/types.ts#L15)

---

### instrument

> **instrument**: [`Instrument`](../../../core/enumerations/Instrument.md)

Defined in: [frontend/src/modules/practice/types.ts:16](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/types.ts#L16)

---

### tempo

> **tempo**: `number`

Defined in: [frontend/src/modules/practice/types.ts:17](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/types.ts#L17)

---

### status

> **status**: [`SessionStatus`](../../../core/sharedTypes/enumerations/SessionStatus.md)

Defined in: [frontend/src/modules/practice/types.ts:18](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/types.ts#L18)

---

### pausedTime?

> `optional` **pausedTime**: `number`

Defined in: [frontend/src/modules/practice/types.ts:19](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/types.ts#L19)

---

### totalPausedDuration

> **totalPausedDuration**: `number`

Defined in: [frontend/src/modules/practice/types.ts:20](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/types.ts#L20)

---

### performance?

> `optional` **performance**: [`SessionPerformance`](SessionPerformance.md)

Defined in: [frontend/src/modules/practice/types.ts:21](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/types.ts#L21)

---

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [frontend/src/modules/practice/types.ts:22](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/types.ts#L22)
