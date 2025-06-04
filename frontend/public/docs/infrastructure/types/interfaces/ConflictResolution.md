[**Mirubato Module Documentation v0.1.0**](../../../README.md)

---

[Mirubato Module Documentation](../../../README.md) / [infrastructure/types](../README.md) / ConflictResolution

# Interface: ConflictResolution

Defined in: [infrastructure/types.ts:45](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L45)

## Properties

### strategy

> **strategy**: `"custom"` \| `"lastWriteWins"` \| `"merge"` \| `"userChoice"`

Defined in: [infrastructure/types.ts:46](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L46)

---

### resolver()?

> `optional` **resolver**: (`local`, `remote`) => `any`

Defined in: [infrastructure/types.ts:47](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L47)

#### Parameters

##### local

`any`

##### remote

`any`

#### Returns

`any`
