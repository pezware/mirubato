[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/infrastructure/types](../README.md) / SyncOperation

# Interface: SyncOperation

Defined in: [frontend/src/modules/infrastructure/types.ts:27](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L27)

## Properties

### id

> **id**: `string`

Defined in: [frontend/src/modules/infrastructure/types.ts:28](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L28)

---

### type

> **type**: `"create"` \| `"update"` \| `"delete"`

Defined in: [frontend/src/modules/infrastructure/types.ts:29](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L29)

---

### resource

> **resource**: `string`

Defined in: [frontend/src/modules/infrastructure/types.ts:30](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L30)

---

### data

> **data**: `any`

Defined in: [frontend/src/modules/infrastructure/types.ts:31](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L31)

---

### timestamp

> **timestamp**: `number`

Defined in: [frontend/src/modules/infrastructure/types.ts:32](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L32)

---

### status

> **status**: `"completed"` \| `"pending"` \| `"syncing"` \| `"failed"`

Defined in: [frontend/src/modules/infrastructure/types.ts:33](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L33)

---

### retryCount

> **retryCount**: `number`

Defined in: [frontend/src/modules/infrastructure/types.ts:34](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L34)

---

### error?

> `optional` **error**: `string`

Defined in: [frontend/src/modules/infrastructure/types.ts:35](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L35)
