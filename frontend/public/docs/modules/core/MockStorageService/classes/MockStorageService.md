[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/core/MockStorageService](../README.md) / MockStorageService

# Class: MockStorageService

Defined in: [frontend/src/modules/core/MockStorageService.ts:5](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/MockStorageService.ts#L5)

Mock storage service for testing - provides same interface as StorageService
but uses in-memory storage instead of event-driven architecture

## Constructors

### Constructor

> **new MockStorageService**(): `MockStorageService`

#### Returns

`MockStorageService`

## Methods

### get()

> **get**\<`T`\>(`key`): `Promise`\<`null` \| `T`\>

Defined in: [frontend/src/modules/core/MockStorageService.ts:8](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/MockStorageService.ts#L8)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`null` \| `T`\>

---

### set()

> **set**\<`T`\>(`key`, `value`, `_ttl?`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/core/MockStorageService.ts:12](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/MockStorageService.ts#L12)

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

##### value

`T`

##### \_ttl?

`number`

#### Returns

`Promise`\<`void`\>

---

### remove()

> **remove**(`key`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/core/MockStorageService.ts:17](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/MockStorageService.ts#L17)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/core/MockStorageService.ts:21](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/MockStorageService.ts#L21)

#### Returns

`Promise`\<`void`\>

---

### getKeys()

> **getKeys**(): `Promise`\<`string`[]\>

Defined in: [frontend/src/modules/core/MockStorageService.ts:25](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/MockStorageService.ts#L25)

#### Returns

`Promise`\<`string`[]\>

---

### getStorageSize()

> **getStorageSize**(): `number`

Defined in: [frontend/src/modules/core/MockStorageService.ts:30](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/MockStorageService.ts#L30)

#### Returns

`number`

---

### getAllData()

> **getAllData**(): `Record`\<`string`, `any`\>

Defined in: [frontend/src/modules/core/MockStorageService.ts:34](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/MockStorageService.ts#L34)

#### Returns

`Record`\<`string`, `any`\>

---

### destroy()

> **destroy**(): `void`

Defined in: [frontend/src/modules/core/MockStorageService.ts:38](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/MockStorageService.ts#L38)

#### Returns

`void`
