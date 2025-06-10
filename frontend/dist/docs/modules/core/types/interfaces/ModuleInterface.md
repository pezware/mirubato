[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/core/types](../README.md) / ModuleInterface

# Interface: ModuleInterface

Defined in: [frontend/src/modules/core/types.ts:31](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L31)

## Extended by

- [`ProgressAnalyticsModuleInterface`](../../../analytics/types/interfaces/ProgressAnalyticsModuleInterface.md)

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/core/types.ts:34](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L34)

#### Returns

`Promise`\<`void`\>

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/core/types.ts:35](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L35)

#### Returns

`Promise`\<`void`\>

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](ModuleHealth.md)

Defined in: [frontend/src/modules/core/types.ts:36](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L36)

#### Returns

[`ModuleHealth`](ModuleHealth.md)

## Properties

### name

> **name**: `string`

Defined in: [frontend/src/modules/core/types.ts:32](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L32)

---

### version

> **version**: `string`

Defined in: [frontend/src/modules/core/types.ts:33](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L33)
