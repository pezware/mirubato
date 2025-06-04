[**Mirubato Module Documentation v0.1.0**](../../../README.md)

---

[Mirubato Module Documentation](../../../README.md) / [infrastructure/SyncModule](../README.md) / SyncModule

# Class: SyncModule

Defined in: [infrastructure/SyncModule.ts:5](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L5)

## Implements

- [`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md)

## Constructors

### Constructor

> **new SyncModule**(`storageModule`, `config?`, `conflictResolution?`): `SyncModule`

Defined in: [infrastructure/SyncModule.ts:22](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L22)

#### Parameters

##### storageModule

[`StorageModule`](../../StorageModule/classes/StorageModule.md)

##### config?

`Partial`\<[`SyncConfig`](../../types/interfaces/SyncConfig.md)\>

##### conflictResolution?

[`ConflictResolution`](../../types/interfaces/ConflictResolution.md)

#### Returns

`SyncModule`

## Properties

### name

> **name**: `string` = `'Sync'`

Defined in: [infrastructure/SyncModule.ts:6](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L6)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`name`](../../../core/types/interfaces/ModuleInterface.md#name)

---

### version

> **version**: `string` = `'1.0.0'`

Defined in: [infrastructure/SyncModule.ts:7](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L7)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`version`](../../../core/types/interfaces/ModuleInterface.md#version)

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [infrastructure/SyncModule.ts:43](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L43)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`initialize`](../../../core/types/interfaces/ModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [infrastructure/SyncModule.ts:94](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L94)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`shutdown`](../../../core/types/interfaces/ModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [infrastructure/SyncModule.ts:118](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L118)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`getHealth`](../../../core/types/interfaces/ModuleInterface.md#gethealth)

---

### queueOperation()

> **queueOperation**(`operation`): `Promise`\<`void`\>

Defined in: [infrastructure/SyncModule.ts:150](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L150)

#### Parameters

##### operation

[`SyncOperation`](../../types/interfaces/SyncOperation.md)

#### Returns

`Promise`\<`void`\>

---

### processSyncQueue()

> **processSyncQueue**(): `Promise`\<`void`\>

Defined in: [infrastructure/SyncModule.ts:162](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L162)

#### Returns

`Promise`\<`void`\>

---

### resolveConflicts()

> **resolveConflicts**(`local`, `remote`): `Promise`\<`any`\>

Defined in: [infrastructure/SyncModule.ts:250](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L250)

#### Parameters

##### local

`any`

##### remote

`any`

#### Returns

`Promise`\<`any`\>

---

### getSyncStatus()

> **getSyncStatus**(): `object`

Defined in: [infrastructure/SyncModule.ts:280](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L280)

#### Returns

`object`

##### pendingOperations

> **pendingOperations**: `number`

##### failedOperations

> **failedOperations**: `number`

##### isSyncing

> **isSyncing**: `boolean`

##### lastSyncTime?

> `optional` **lastSyncTime**: `number`

---

### forceSyncAll()

> **forceSyncAll**(): `Promise`\<`void`\>

Defined in: [infrastructure/SyncModule.ts:298](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L298)

#### Returns

`Promise`\<`void`\>

---

### clearQueue()

> **clearQueue**(): `void`

Defined in: [infrastructure/SyncModule.ts:327](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L327)

#### Returns

`void`

---

### getQueueSize()

> **getQueueSize**(): `number`

Defined in: [infrastructure/SyncModule.ts:331](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L331)

#### Returns

`number`

---

### getOperation()

> **getOperation**(`id`): `undefined` \| [`SyncOperation`](../../types/interfaces/SyncOperation.md)

Defined in: [infrastructure/SyncModule.ts:335](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/SyncModule.ts#L335)

#### Parameters

##### id

`string`

#### Returns

`undefined` \| [`SyncOperation`](../../types/interfaces/SyncOperation.md)
