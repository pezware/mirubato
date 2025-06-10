[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/infrastructure/types](../README.md) / ConflictResolution

# Interface: ConflictResolution

Defined in: [frontend/src/modules/infrastructure/types.ts:45](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L45)

## Properties

### strategy

> **strategy**: `"custom"` \| `"lastWriteWins"` \| `"merge"` \| `"userChoice"`

Defined in: [frontend/src/modules/infrastructure/types.ts:46](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L46)

---

### resolver()?

> `optional` **resolver**: (`local`, `remote`) => `any`

Defined in: [frontend/src/modules/infrastructure/types.ts:47](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L47)

#### Parameters

##### local

`any`

##### remote

`any`

#### Returns

`any`
