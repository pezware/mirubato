[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/logger/types](../README.md) / PracticeReport

# Interface: PracticeReport

Defined in: [frontend/src/modules/logger/types.ts:79](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L79)

## Properties

### userId

> **userId**: `string`

Defined in: [frontend/src/modules/logger/types.ts:80](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L80)

---

### startDate

> **startDate**: `number`

Defined in: [frontend/src/modules/logger/types.ts:81](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L81)

---

### endDate

> **endDate**: `number`

Defined in: [frontend/src/modules/logger/types.ts:82](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L82)

---

### totalDuration

> **totalDuration**: `number`

Defined in: [frontend/src/modules/logger/types.ts:83](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L83)

---

### totalEntries

> **totalEntries**: `number`

Defined in: [frontend/src/modules/logger/types.ts:84](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L84)

---

### averageDuration

> **averageDuration**: `number`

Defined in: [frontend/src/modules/logger/types.ts:85](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L85)

---

### entriesByType

> **entriesByType**: `Record`\<[`LogbookEntry`](LogbookEntry.md)\[`"type"`\], `number`\>

Defined in: [frontend/src/modules/logger/types.ts:86](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L86)

---

### topPieces

> **topPieces**: `object`[]

Defined in: [frontend/src/modules/logger/types.ts:87](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L87)

#### piece

> **piece**: [`PieceReference`](PieceReference.md)

#### duration

> **duration**: `number`

#### count

> **count**: `number`

---

### goalProgress

> **goalProgress**: `object`[]

Defined in: [frontend/src/modules/logger/types.ts:88](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L88)

#### goal

> **goal**: [`Goal`](Goal.md)

#### progress

> **progress**: `number`

---

### moodDistribution

> **moodDistribution**: `Record`\<`NonNullable`\<[`LogbookEntry`](LogbookEntry.md)\[`"mood"`\]\>, `number`\>

Defined in: [frontend/src/modules/logger/types.ts:89](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L89)

---

### practiceStreak

> **practiceStreak**: `number`

Defined in: [frontend/src/modules/logger/types.ts:90](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L90)

---

### longestSession

> **longestSession**: `null` \| [`LogbookEntry`](LogbookEntry.md)

Defined in: [frontend/src/modules/logger/types.ts:91](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L91)
