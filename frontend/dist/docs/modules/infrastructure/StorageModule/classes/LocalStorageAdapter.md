[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/infrastructure/StorageModule](../README.md) / LocalStorageAdapter

# Class: LocalStorageAdapter

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:10](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L10)

## Implements

- [`StorageAdapter`](../../types/interfaces/StorageAdapter.md)

## Constructors

### Constructor

> **new LocalStorageAdapter**(`namespace`): `LocalStorageAdapter`

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:13](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L13)

#### Parameters

##### namespace

`string` = `'mirubato'`

#### Returns

`LocalStorageAdapter`

## Methods

### get()

> **get**\<`T`\>(`key`): `Promise`\<`null` \| `T`\>

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:21](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L21)

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

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:48](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L48)

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

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:74](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L74)

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

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:79](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L79)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`StorageAdapter`](../../types/interfaces/StorageAdapter.md).[`clear`](../../types/interfaces/StorageAdapter.md#clear)

---

### getKeys()

> **getKeys**(): `Promise`\<`string`[]\>

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:86](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L86)

#### Returns

`Promise`\<`string`[]\>

#### Implementation of

[`StorageAdapter`](../../types/interfaces/StorageAdapter.md).[`getKeys`](../../types/interfaces/StorageAdapter.md#getkeys)

---

### getMetadata()

> **getMetadata**(`key`): `Promise`\<`null` \| [`StorageMetadata`](../../types/interfaces/StorageMetadata.md)\>

Defined in: [frontend/src/modules/infrastructure/StorageModule.ts:100](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/StorageModule.ts#L100)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`null` \| [`StorageMetadata`](../../types/interfaces/StorageMetadata.md)\>
