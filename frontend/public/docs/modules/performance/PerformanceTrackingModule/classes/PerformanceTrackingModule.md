[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/performance/PerformanceTrackingModule](../README.md) / PerformanceTrackingModule

# Class: PerformanceTrackingModule

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:22](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L22)

## Implements

- [`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md)

## Constructors

### Constructor

> **new PerformanceTrackingModule**(`config?`, `storageService?`): `PerformanceTrackingModule`

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:40](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L40)

#### Parameters

##### config?

`Partial`\<[`PerformanceConfig`](../../types/interfaces/PerformanceConfig.md)\>

##### storageService?

`any`

#### Returns

`PerformanceTrackingModule`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:55](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L55)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`initialize`](../../../core/types/interfaces/ModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:100](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L100)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`shutdown`](../../../core/types/interfaces/ModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:123](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L123)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`getHealth`](../../../core/types/interfaces/ModuleInterface.md#gethealth)

---

### startSessionTracking()

> **startSessionTracking**(`sessionId`): `void`

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:147](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L147)

#### Parameters

##### sessionId

`string`

#### Returns

`void`

---

### endSessionTracking()

> **endSessionTracking**(`sessionId`): `Promise`\<[`PerformanceAnalysis`](../../types/interfaces/PerformanceAnalysis.md)\>

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:160](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L160)

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`PerformanceAnalysis`](../../types/interfaces/PerformanceAnalysis.md)\>

---

### recordNoteEvent()

> **recordNoteEvent**(`data`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:188](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L188)

#### Parameters

##### data

`any`

#### Returns

`Promise`\<`void`\>

---

### generatePerformanceAnalysis()

> **generatePerformanceAnalysis**(`sessionId`): `Promise`\<[`PerformanceAnalysis`](../../types/interfaces/PerformanceAnalysis.md)\>

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:219](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L219)

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`PerformanceAnalysis`](../../types/interfaces/PerformanceAnalysis.md)\>

---

### getSessionData()

> **getSessionData**(`sessionId`): `Promise`\<[`PerformanceData`](../../types/interfaces/PerformanceData.md)[]\>

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:669](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L669)

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`PerformanceData`](../../types/interfaces/PerformanceData.md)[]\>

---

### getAnalysis()

> **getAnalysis**(`sessionId`): `Promise`\<`null` \| [`PerformanceAnalysis`](../../types/interfaces/PerformanceAnalysis.md)\>

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:676](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L676)

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`null` \| [`PerformanceAnalysis`](../../types/interfaces/PerformanceAnalysis.md)\>

---

### getUserStats()

> **getUserStats**(`userId`): `Promise`\<[`PerformanceMetrics`](../../types/interfaces/PerformanceMetrics.md)\>

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:684](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L684)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`PerformanceMetrics`](../../types/interfaces/PerformanceMetrics.md)\>

---

### onRealTimeFeedback()

> **onRealTimeFeedback**(`callback`): () => `void`

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:692](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L692)

#### Parameters

##### callback

(`feedback`) => `void`

#### Returns

> (): `void`

##### Returns

`void`

---

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:699](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L699)

#### Parameters

##### config

`Partial`\<[`PerformanceConfig`](../../types/interfaces/PerformanceConfig.md)\>

#### Returns

`void`

---

### getConfig()

> **getConfig**(): [`PerformanceConfig`](../../types/interfaces/PerformanceConfig.md)

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:703](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L703)

#### Returns

[`PerformanceConfig`](../../types/interfaces/PerformanceConfig.md)

---

### clearAllData()

> **clearAllData**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:743](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L743)

#### Returns

`Promise`\<`void`\>

---

### getCurrentSessionData()

> **getCurrentSessionData**(): [`PerformanceData`](../../types/interfaces/PerformanceData.md)[]

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:748](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L748)

#### Returns

[`PerformanceData`](../../types/interfaces/PerformanceData.md)[]

## Properties

### name

> **name**: `string` = `'PerformanceTracking'`

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:23](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L23)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`name`](../../../core/types/interfaces/ModuleInterface.md#name)

---

### version

> **version**: `string` = `'1.0.0'`

Defined in: [frontend/src/modules/performance/PerformanceTrackingModule.ts:24](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/performance/PerformanceTrackingModule.ts#L24)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`version`](../../../core/types/interfaces/ModuleInterface.md#version)
