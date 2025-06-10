[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/logger/types](../README.md) / LoggerEvents

# Interface: LoggerEvents

Defined in: [frontend/src/modules/logger/types.ts:101](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L101)

## Properties

### logger:entry:created

> **logger:entry:created**: `object`

Defined in: [frontend/src/modules/logger/types.ts:102](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L102)

#### entry

> **entry**: [`LogbookEntry`](LogbookEntry.md)

---

### logger:entry:updated

> **logger:entry:updated**: `object`

Defined in: [frontend/src/modules/logger/types.ts:103](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L103)

#### entry

> **entry**: [`LogbookEntry`](LogbookEntry.md)

#### changes

> **changes**: `Partial`\<[`LogbookEntry`](LogbookEntry.md)\>

---

### logger:entry:deleted

> **logger:entry:deleted**: `object`

Defined in: [frontend/src/modules/logger/types.ts:107](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L107)

#### entryId

> **entryId**: `string`

---

### logger:goal:created

> **logger:goal:created**: `object`

Defined in: [frontend/src/modules/logger/types.ts:108](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L108)

#### goal

> **goal**: [`Goal`](Goal.md)

---

### logger:goal:updated

> **logger:goal:updated**: `object`

Defined in: [frontend/src/modules/logger/types.ts:109](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L109)

#### goal

> **goal**: [`Goal`](Goal.md)

#### changes

> **changes**: `Partial`\<[`Goal`](Goal.md)\>

---

### logger:goal:completed

> **logger:goal:completed**: `object`

Defined in: [frontend/src/modules/logger/types.ts:110](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L110)

#### goal

> **goal**: [`Goal`](Goal.md)

---

### logger:export:ready

> **logger:export:ready**: `object`

Defined in: [frontend/src/modules/logger/types.ts:111](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L111)

#### result

> **result**: [`ExportResult`](ExportResult.md)

---

### logger:report:generated

> **logger:report:generated**: `object`

Defined in: [frontend/src/modules/logger/types.ts:112](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/types.ts#L112)

#### report

> **report**: [`PracticeReport`](PracticeReport.md)
