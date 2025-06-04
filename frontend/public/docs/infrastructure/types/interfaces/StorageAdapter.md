[**Mirubato Module Documentation v0.1.0**](../../../README.md)

---

[Mirubato Module Documentation](../../../README.md) / [infrastructure/types](../README.md) / StorageAdapter

# Interface: StorageAdapter

Defined in: [infrastructure/types.ts:3](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L3)

## Methods

### get()

> **get**\<`T`\>(`key`): `Promise`\<`null` \| `T`\>

Defined in: [infrastructure/types.ts:4](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L4)

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

Defined in: [infrastructure/types.ts:5](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L5)

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

Defined in: [infrastructure/types.ts:6](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L6)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [infrastructure/types.ts:7](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L7)

#### Returns

`Promise`\<`void`\>

---

### getKeys()

> **getKeys**(): `Promise`\<`string`[]\>

Defined in: [infrastructure/types.ts:8](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/infrastructure/types.ts#L8)

#### Returns

`Promise`\<`string`[]\>
