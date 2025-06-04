[**Mirubato Module Documentation v0.1.0**](../../../README.md)

---

[Mirubato Module Documentation](../../../README.md) / [infrastructure/StorageModule](../README.md) / LocalStorageAdapter

# Class: LocalStorageAdapter

Defined in: [infrastructure/StorageModule.ts:4](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L4)

## Implements

- [`StorageAdapter`](../../types/interfaces/StorageAdapter.md)

## Constructors

### Constructor

> **new LocalStorageAdapter**(`namespace`): `LocalStorageAdapter`

Defined in: [infrastructure/StorageModule.ts:7](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L7)

#### Parameters

##### namespace

`string` = `'mirubato'`

#### Returns

`LocalStorageAdapter`

## Methods

### get()

> **get**\<`T`\>(`key`): `Promise`\<`null` \| `T`\>

Defined in: [infrastructure/StorageModule.ts:15](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L15)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`null` \| `T`\>

#### Implementation of

[`StorageAdapter`](../../types/interfaces/StorageAdapter.md).[`get`](../../types/interfaces/StorageAdapter.md#get)

---

### set()

> **set**\<`T`\>(`key`, `value`, `ttl?`): `Promise`\<`void`\>

Defined in: [infrastructure/StorageModule.ts:42](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L42)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

##### value

`T`

##### ttl?

`number`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`StorageAdapter`](../../types/interfaces/StorageAdapter.md).[`set`](../../types/interfaces/StorageAdapter.md#set)

---

### remove()

> **remove**(`key`): `Promise`\<`void`\>

Defined in: [infrastructure/StorageModule.ts:68](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L68)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`StorageAdapter`](../../types/interfaces/StorageAdapter.md).[`remove`](../../types/interfaces/StorageAdapter.md#remove)

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [infrastructure/StorageModule.ts:73](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L73)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`StorageAdapter`](../../types/interfaces/StorageAdapter.md).[`clear`](../../types/interfaces/StorageAdapter.md#clear)

---

### getKeys()

> **getKeys**(): `Promise`\<`string`[]\>

Defined in: [infrastructure/StorageModule.ts:80](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L80)

#### Returns

`Promise`\<`string`[]\>

#### Implementation of

[`StorageAdapter`](../../types/interfaces/StorageAdapter.md).[`getKeys`](../../types/interfaces/StorageAdapter.md#getkeys)

---

### getMetadata()

> **getMetadata**(`key`): `Promise`\<`null` \| [`StorageMetadata`](../../types/interfaces/StorageMetadata.md)\>

Defined in: [infrastructure/StorageModule.ts:94](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/StorageModule.ts#L94)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`null` \| [`StorageMetadata`](../../types/interfaces/StorageMetadata.md)\>
