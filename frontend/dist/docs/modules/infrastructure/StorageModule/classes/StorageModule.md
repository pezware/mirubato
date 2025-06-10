[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/infrastructure/StorageModule](../README.md) / StorageModule

# Class: StorageModule

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:114](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L114)

## Implements

- [`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md)

## Constructors

### Constructor

> **new StorageModule**(`config?`): `StorageModule`

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:126](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L126)

#### Parameters

##### config?

[`StorageConfig`](../../types/interfaces/StorageConfig.md)

#### Returns

`StorageModule`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:144](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L144)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`initialize`](../../../core/types/interfaces/ModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:202](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L202)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`shutdown`](../../../core/types/interfaces/ModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:217](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L217)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`getHealth`](../../../core/types/interfaces/ModuleInterface.md#gethealth)

---

### saveLocal()

> **saveLocal**\<`T`\>(`key`, `data`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:281](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L281)

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

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:305](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L305)

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

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:333](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L333)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

---

### clearLocal()

> **clearLocal**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:357](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L357)

#### Returns

`Promise`\<`void`\>

---

### getKeys()

> **getKeys**(): `Promise`\<`string`[]\>

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:380](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L380)

#### Returns

`Promise`\<`string`[]\>

---

### saveCloud()

> **saveCloud**\<`T`\>(`key`, `_data`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:385](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L385)

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

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:395](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L395)

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

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:406](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L406)

#### Returns

`Promise`\<`void`\>

---

### getStorageInfo()

> **getStorageInfo**(): `Promise`\<\{ `used`: `number`; `available`: `number`; `quota`: `number`; \}\>

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:417](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L417)

#### Returns

`Promise`\<\{ `used`: `number`; `available`: `number`; `quota`: `number`; \}\>

## Properties

### name

> **name**: `string` = `'Storage'`

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:115](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L115)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`name`](../../../core/types/interfaces/ModuleInterface.md#name)

---

### version

> **version**: `string` = `'1.0.0'`

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:116](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L116)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`version`](../../../core/types/interfaces/ModuleInterface.md#version)
