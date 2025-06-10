[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/infrastructure/types](../README.md) / StorageAdapter

# Interface: StorageAdapter

Defined in: [frontend/src/modules/infrastructure/types.ts:3](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L3)

## Methods

### get()

> **get**\<`T`\>(`key`): `Promise`\<`null` \| `T`\>

Defined in: [frontend/src/modules/infrastructure/types.ts:4](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L4)

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

Defined in: [frontend/src/modules/infrastructure/types.ts:5](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L5)

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

Defined in: [frontend/src/modules/infrastructure/types.ts:6](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L6)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/infrastructure/types.ts:7](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L7)

#### Returns

`Promise`\<`void`\>

---

### getKeys()

> **getKeys**(): `Promise`\<`string`[]\>

Defined in: [frontend/src/modules/infrastructure/types.ts:8](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/infrastructure/types.ts#L8)

#### Returns

`Promise`\<`string`[]\>
