[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/core/StorageService](../README.md) / StorageService

# Class: StorageService

Defined in: [frontend/src/modules/core/StorageService.ts:8](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/StorageService.ts#L8)

Event-driven storage service that decouples business modules from direct storage dependencies.
Uses the EventBus to communicate with the actual storage implementation.

## Constructors

### Constructor

> **new StorageService**(`eventBus?`, `options?`): `StorageService`

Defined in: [frontend/src/modules/core/StorageService.ts:20](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/StorageService.ts#L20)

#### Parameters

##### eventBus?

[`EventBus`](../../EventBus/classes/EventBus.md)

##### options?

###### testMode?

`boolean`

#### Returns

`StorageService`

## Methods

### get()

> **get**\<`T`\>(`key`): `Promise`\<`null` \| `T`\>

Defined in: [frontend/src/modules/core/StorageService.ts:95](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/StorageService.ts#L95)

Get a value from storage

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

> **set**\<`T`\>(`key`, `value`, `ttl?`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/core/StorageService.ts:109](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/StorageService.ts#L109)

Set a value in storage

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

---

### remove()

> **remove**(`key`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/core/StorageService.ts:125](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/StorageService.ts#L125)

Remove a value from storage

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/core/StorageService.ts:139](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/StorageService.ts#L139)

Clear all storage

#### Returns

`Promise`\<`void`\>

---

### getKeys()

> **getKeys**(): `Promise`\<`string`[]\>

Defined in: [frontend/src/modules/core/StorageService.ts:152](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/StorageService.ts#L152)

Get all storage keys

#### Returns

`Promise`\<`string`[]\>

---

### destroy()

> **destroy**(): `void`

Defined in: [frontend/src/modules/core/StorageService.ts:165](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/StorageService.ts#L165)

Cleanup pending requests and unsubscribe from events

#### Returns

`void`
