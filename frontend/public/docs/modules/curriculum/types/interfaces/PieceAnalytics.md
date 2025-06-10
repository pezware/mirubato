[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/curriculum/types](../README.md) / PieceAnalytics

# Interface: PieceAnalytics

Defined in: [frontend/src/modules/curriculum/types.ts:358](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L358)

## Properties

### pieceId

> **pieceId**: `string`

Defined in: [frontend/src/modules/curriculum/types.ts:359](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L359)

---

### userId

> **userId**: `string`

Defined in: [frontend/src/modules/curriculum/types.ts:360](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L360)

---

### totalPracticeTime

> **totalPracticeTime**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:361](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L361)

---

### sessionsCount

> **sessionsCount**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:362](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L362)

---

### averageAccuracy

> **averageAccuracy**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:363](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L363)

---

### bestAccuracy

> **bestAccuracy**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:364](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L364)

---

### tempoProgress

> **tempoProgress**: `object`

Defined in: [frontend/src/modules/curriculum/types.ts:365](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L365)

#### initial

> **initial**: `number`

#### current

> **current**: `number`

#### target

> **target**: `number`

---

### problemAreas

> **problemAreas**: `object`[]

Defined in: [frontend/src/modules/curriculum/types.ts:370](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L370)

#### measures

> **measures**: `object`

##### measures.start

> **start**: `number`

##### measures.end

> **end**: `number`

#### difficulty

> **difficulty**: `string`

#### practiceTime

> **practiceTime**: `number`

#### improvementRate

> **improvementRate**: `number`

---

### performanceHistory

> **performanceHistory**: `object`[]

Defined in: [frontend/src/modules/curriculum/types.ts:376](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L376)

#### date

> **date**: `number`

#### type

> **type**: `"practice"` \| `"performance"` \| `"lesson"`

#### quality

> **quality**: `number`

#### notes?

> `optional` **notes**: `string`

---

### updatedAt

> **updatedAt**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:382](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L382)
