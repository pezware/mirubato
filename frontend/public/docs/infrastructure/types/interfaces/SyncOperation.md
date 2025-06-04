[**Mirubato Module Documentation v0.1.0**](../../../README.md)

---

[Mirubato Module Documentation](../../../README.md) / [infrastructure/types](../README.md) / SyncOperation

# Interface: SyncOperation

Defined in: [infrastructure/types.ts:27](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L27)

## Properties

### id

> **id**: `string`

Defined in: [infrastructure/types.ts:28](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L28)

---

### type

> **type**: `"create"` \| `"update"` \| `"delete"`

Defined in: [infrastructure/types.ts:29](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L29)

---

### resource

> **resource**: `string`

Defined in: [infrastructure/types.ts:30](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L30)

---

### data

> **data**: `any`

Defined in: [infrastructure/types.ts:31](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L31)

---

### timestamp

> **timestamp**: `number`

Defined in: [infrastructure/types.ts:32](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L32)

---

### status

> **status**: `"pending"` \| `"syncing"` \| `"completed"` \| `"failed"`

Defined in: [infrastructure/types.ts:33](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L33)

---

### retryCount

> **retryCount**: `number`

Defined in: [infrastructure/types.ts:34](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L34)

---

### error?

> `optional` **error**: `string`

Defined in: [infrastructure/types.ts:35](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L35)
