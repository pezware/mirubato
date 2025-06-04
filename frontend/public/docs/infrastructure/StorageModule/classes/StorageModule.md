[**Mirubato Module Documentation v0.1.0**](../../../README.md)

---

[Mirubato Module Documentation](../../../README.md) / [infrastructure/StorageModule](../README.md) / StorageModule

# Class: StorageModule

Defined in: [infrastructure/StorageModule.ts:108](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L108)

## Implements

- [`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md)

## Constructors

### Constructor

> **new StorageModule**(`config?`): `StorageModule`

Defined in: [infrastructure/StorageModule.ts:120](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L120)

#### Parameters

##### config?

[`StorageConfig`](../../types/interfaces/StorageConfig.md)

#### Returns

`StorageModule`

## Properties

### name

> **name**: `string` = `'Storage'`

Defined in: [infrastructure/StorageModule.ts:109](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L109)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`name`](../../../core/types/interfaces/ModuleInterface.md#name)

---

### version

> **version**: `string` = `'1.0.0'`

Defined in: [infrastructure/StorageModule.ts:110](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L110)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`version`](../../../core/types/interfaces/ModuleInterface.md#version)

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [infrastructure/StorageModule.ts:138](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L138)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`initialize`](../../../core/types/interfaces/ModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [infrastructure/StorageModule.ts:190](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L190)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`shutdown`](../../../core/types/interfaces/ModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [infrastructure/StorageModule.ts:205](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L205)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`getHealth`](../../../core/types/interfaces/ModuleInterface.md#gethealth)

---

### saveLocal()

> **saveLocal**\<`T`\>(`key`, `data`): `Promise`\<`void`\>

Defined in: [infrastructure/StorageModule.ts:210](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L210)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

##### data

`T`

#### Returns

`Promise`\<`void`\>

---

### loadLocal()

> **loadLocal**\<`T`\>(`key`): `Promise`\<`null` \| `T`\>

Defined in: [infrastructure/StorageModule.ts:234](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L234)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`null` \| `T`\>

---

### deleteLocal()

> **deleteLocal**(`key`): `Promise`\<`void`\>

Defined in: [infrastructure/StorageModule.ts:262](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L262)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

---

### clearLocal()

> **clearLocal**(): `Promise`\<`void`\>

Defined in: [infrastructure/StorageModule.ts:286](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L286)

#### Returns

`Promise`\<`void`\>

---

### getKeys()

> **getKeys**(): `Promise`\<`string`[]\>

Defined in: [infrastructure/StorageModule.ts:309](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L309)

#### Returns

`Promise`\<`string`[]\>

---

### saveCloud()

> **saveCloud**\<`T`\>(`key`, `_data`): `Promise`\<`void`\>

Defined in: [infrastructure/StorageModule.ts:314](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L314)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

##### \_data

`T`

#### Returns

`Promise`\<`void`\>

---

### loadCloud()

> **loadCloud**\<`T`\>(`key`): `Promise`\<`null` \| `T`\>

Defined in: [infrastructure/StorageModule.ts:324](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L324)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`null` \| `T`\>

---

### syncData()

> **syncData**(): `Promise`\<`void`\>

Defined in: [infrastructure/StorageModule.ts:335](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L335)

#### Returns

`Promise`\<`void`\>

---

### getStorageInfo()

> **getStorageInfo**(): `Promise`\<\{ `used`: `number`; `available`: `number`; `quota`: `number`; \}\>

Defined in: [infrastructure/StorageModule.ts:346](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L346)

#### Returns

`Promise`\<\{ `used`: `number`; `available`: `number`; `quota`: `number`; \}\>
