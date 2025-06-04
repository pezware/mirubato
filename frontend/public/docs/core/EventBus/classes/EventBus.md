[**Mirubato Module Documentation v0.1.0**](../../../README.md)

---

[Mirubato Module Documentation](../../../README.md) / [core/EventBus](../README.md) / EventBus

# Class: EventBus

Defined in: [core/EventBus.ts:8](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/EventBus.ts#L8)

## Methods

### getInstance()

> `static` **getInstance**(): `EventBus`

Defined in: [core/EventBus.ts:17](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/EventBus.ts#L17)

#### Returns

`EventBus`

---

### resetInstance()

> `static` **resetInstance**(): `void`

Defined in: [core/EventBus.ts:24](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/EventBus.ts#L24)

#### Returns

`void`

---

### subscribe()

> **subscribe**(`pattern`, `callback`, `options?`): `string`

Defined in: [core/EventBus.ts:28](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/EventBus.ts#L28)

#### Parameters

##### pattern

`string`

##### callback

[`EventCallback`](../../types/type-aliases/EventCallback.md)

##### options?

###### priority?

[`EventPriority`](../../types/enumerations/EventPriority.md)

###### filter?

(`payload`) => `boolean`

#### Returns

`string`

---

### unsubscribe()

> **unsubscribe**(`subscriptionId`): `boolean`

Defined in: [core/EventBus.ts:59](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/EventBus.ts#L59)

#### Parameters

##### subscriptionId

`string`

#### Returns

`boolean`

---

### publish()

> **publish**(`event`): `Promise`\<`void`\>

Defined in: [core/EventBus.ts:73](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/EventBus.ts#L73)

#### Parameters

##### event

`Omit`\<[`EventPayload`](../../types/interfaces/EventPayload.md), `"eventId"` \| `"timestamp"`\>

#### Returns

`Promise`\<`void`\>

---

### getEventHistory()

> **getEventHistory**(`filter?`): [`EventPayload`](../../types/interfaces/EventPayload.md)[]

Defined in: [core/EventBus.ts:123](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/EventBus.ts#L123)

#### Parameters

##### filter?

###### source?

`string`

###### type?

`string`

###### limit?

`number`

###### since?

`number`

#### Returns

[`EventPayload`](../../types/interfaces/EventPayload.md)[]

---

### clearHistory()

> **clearHistory**(): `void`

Defined in: [core/EventBus.ts:152](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/EventBus.ts#L152)

#### Returns

`void`

---

### getSubscriptionCount()

> **getSubscriptionCount**(): `number`

Defined in: [core/EventBus.ts:156](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/core/EventBus.ts#L156)

#### Returns

`number`
