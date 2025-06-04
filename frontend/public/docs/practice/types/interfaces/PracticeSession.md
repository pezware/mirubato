[**Mirubato Module Documentation v0.1.0**](../../../README.md)

---

[Mirubato Module Documentation](../../../README.md) / [practice/types](../README.md) / PracticeSession

# Interface: PracticeSession

Defined in: [practice/types.ts:3](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L3)

## Properties

### id

> **id**: `string`

Defined in: [practice/types.ts:4](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L4)

---

### userId

> **userId**: `string`

Defined in: [practice/types.ts:5](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L5)

---

### startTime

> **startTime**: `number`

Defined in: [practice/types.ts:6](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L6)

---

### endTime?

> `optional` **endTime**: `number`

Defined in: [practice/types.ts:7](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L7)

---

### sheetMusicId

> **sheetMusicId**: `string`

Defined in: [practice/types.ts:8](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L8)

---

### sheetMusicTitle

> **sheetMusicTitle**: `string`

Defined in: [practice/types.ts:9](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L9)

---

### instrument

> **instrument**: `"piano"` \| `"guitar"`

Defined in: [practice/types.ts:10](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L10)

---

### tempo

> **tempo**: `number`

Defined in: [practice/types.ts:11](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L11)

---

### status

> **status**: `"active"` \| `"paused"` \| `"completed"` \| `"abandoned"`

Defined in: [practice/types.ts:12](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L12)

---

### pausedTime?

> `optional` **pausedTime**: `number`

Defined in: [practice/types.ts:13](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L13)

---

### totalPausedDuration

> **totalPausedDuration**: `number`

Defined in: [practice/types.ts:14](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L14)

---

### performance?

> `optional` **performance**: [`SessionPerformance`](SessionPerformance.md)

Defined in: [practice/types.ts:15](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L15)

---

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [practice/types.ts:16](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/types.ts#L16)
