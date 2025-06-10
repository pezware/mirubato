[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/core/types](../README.md) / EventSubscription

# Interface: EventSubscription

Defined in: [frontend/src/modules/core/types.ts:23](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L23)

## Properties

### id

> **id**: `string`

Defined in: [frontend/src/modules/core/types.ts:24](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L24)

---

### pattern

> **pattern**: `string`

Defined in: [frontend/src/modules/core/types.ts:25](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L25)

---

### callback()

> **callback**: (`payload`) => `void` \| `Promise`\<`void`\>

Defined in: [frontend/src/modules/core/types.ts:26](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L26)

#### Parameters

##### payload

[`EventPayload`](EventPayload.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### priority?

> `optional` **priority**: [`EventPriority`](../enumerations/EventPriority.md)

Defined in: [frontend/src/modules/core/types.ts:27](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L27)

---

### filter()?

> `optional` **filter**: (`payload`) => `boolean`

Defined in: [frontend/src/modules/core/types.ts:28](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L28)

#### Parameters

##### payload

[`EventPayload`](EventPayload.md)

#### Returns

`boolean`
