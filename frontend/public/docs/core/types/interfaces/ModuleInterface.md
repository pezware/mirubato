[**Mirubato Module Documentation v0.1.0**](../../../README.md)

---

[Mirubato Module Documentation](../../../README.md) / [core/types](../README.md) / ModuleInterface

# Interface: ModuleInterface

Defined in: [core/types.ts:31](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/types.ts#L31)

## Extended by

- [`ProgressAnalyticsModuleInterface`](../../../analytics/types/interfaces/ProgressAnalyticsModuleInterface.md)

## Properties

### name

> **name**: `string`

Defined in: [core/types.ts:32](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/types.ts#L32)

---

### version

> **version**: `string`

Defined in: [core/types.ts:33](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/types.ts#L33)

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [core/types.ts:34](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/types.ts#L34)

#### Returns

`Promise`\<`void`\>

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [core/types.ts:35](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/types.ts#L35)

#### Returns

`Promise`\<`void`\>

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](ModuleHealth.md)

Defined in: [core/types.ts:36](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/types.ts#L36)

#### Returns

[`ModuleHealth`](ModuleHealth.md)
