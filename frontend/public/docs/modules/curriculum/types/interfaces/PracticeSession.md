[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/curriculum/types](../README.md) / PracticeSession

# Interface: PracticeSession

Defined in: [frontend/src/modules/curriculum/types.ts:204](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L204)

## Properties

### id

> **id**: `string`

Defined in: [frontend/src/modules/curriculum/types.ts:205](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L205)

---

### userId

> **userId**: `string`

Defined in: [frontend/src/modules/curriculum/types.ts:206](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L206)

---

### pieceId

> **pieceId**: `string`

Defined in: [frontend/src/modules/curriculum/types.ts:207](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L207)

---

### config

> **config**: [`PracticeConfig`](PracticeConfig.md)

Defined in: [frontend/src/modules/curriculum/types.ts:208](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L208)

---

### startTime

> **startTime**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:209](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L209)

---

### endTime?

> `optional` **endTime**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:210](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L210)

---

### status

> **status**: `"active"` \| `"paused"` \| `"completed"` \| `"cancelled"`

Defined in: [frontend/src/modules/curriculum/types.ts:211](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L211)

---

### repetitions

> **repetitions**: [`PracticeRepetition`](PracticeRepetition.md)[]

Defined in: [frontend/src/modules/curriculum/types.ts:212](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L212)

---

### overallProgress

> **overallProgress**: [`PracticeProgress`](PracticeProgress.md)

Defined in: [frontend/src/modules/curriculum/types.ts:213](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L213)

---

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [frontend/src/modules/curriculum/types.ts:214](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L214)
