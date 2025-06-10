[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/logger/types](../README.md) / LogbookEntry

# Interface: LogbookEntry

Defined in: [frontend/src/modules/logger/types.ts:5](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L5)

Types for the Practice Logger Module

## Properties

### id

> **id**: `string`

Defined in: [frontend/src/modules/logger/types.ts:6](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L6)

---

### userId

> **userId**: `string`

Defined in: [frontend/src/modules/logger/types.ts:7](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L7)

---

### timestamp

> **timestamp**: `number`

Defined in: [frontend/src/modules/logger/types.ts:8](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L8)

---

### duration

> **duration**: `number`

Defined in: [frontend/src/modules/logger/types.ts:9](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L9)

---

### type

> **type**: `"practice"` \| `"performance"` \| `"lesson"` \| `"rehearsal"`

Defined in: [frontend/src/modules/logger/types.ts:10](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L10)

---

### pieces

> **pieces**: [`PieceReference`](PieceReference.md)[]

Defined in: [frontend/src/modules/logger/types.ts:11](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L11)

---

### techniques

> **techniques**: `string`[]

Defined in: [frontend/src/modules/logger/types.ts:12](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L12)

---

### goals

> **goals**: `string`[]

Defined in: [frontend/src/modules/logger/types.ts:13](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L13)

---

### notes

> **notes**: `string`

Defined in: [frontend/src/modules/logger/types.ts:14](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L14)

---

### mood?

> `optional` **mood**: `"satisfied"` \| `"frustrated"` \| `"neutral"` \| `"excited"`

Defined in: [frontend/src/modules/logger/types.ts:15](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L15)

---

### tags

> **tags**: `string`[]

Defined in: [frontend/src/modules/logger/types.ts:16](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L16)

---

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [frontend/src/modules/logger/types.ts:17](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L17)

---

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [frontend/src/modules/logger/types.ts:18](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L18)
