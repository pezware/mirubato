[**Mirubato Module Documentation v0.1.0**](../../../README.md)

---

[Mirubato Module Documentation](../../../README.md) / [performance/PerformanceTrackingModule](../README.md) / PerformanceTrackingModule

# Class: PerformanceTrackingModule

Defined in: [performance/PerformanceTrackingModule.ts:18](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L18)

## Implements

- [`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md)

## Constructors

### Constructor

> **new PerformanceTrackingModule**(`storageModule`, `config?`): `PerformanceTrackingModule`

Defined in: [performance/PerformanceTrackingModule.ts:36](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L36)

#### Parameters

##### storageModule

[`StorageModule`](../../../infrastructure/StorageModule/classes/StorageModule.md)

##### config?

`Partial`\<[`PerformanceConfig`](../../types/interfaces/PerformanceConfig.md)\>

#### Returns

`PerformanceTrackingModule`

## Properties

### name

> **name**: `string` = `'PerformanceTracking'`

Defined in: [performance/PerformanceTrackingModule.ts:19](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L19)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`name`](../../../core/types/interfaces/ModuleInterface.md#name)

---

### version

> **version**: `string` = `'1.0.0'`

Defined in: [performance/PerformanceTrackingModule.ts:20](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L20)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`version`](../../../core/types/interfaces/ModuleInterface.md#version)

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [performance/PerformanceTrackingModule.ts:54](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L54)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`initialize`](../../../core/types/interfaces/ModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [performance/PerformanceTrackingModule.ts:99](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L99)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`shutdown`](../../../core/types/interfaces/ModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [performance/PerformanceTrackingModule.ts:122](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L122)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`getHealth`](../../../core/types/interfaces/ModuleInterface.md#gethealth)

---

### startSessionTracking()

> **startSessionTracking**(`sessionId`): `void`

Defined in: [performance/PerformanceTrackingModule.ts:146](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L146)

#### Parameters

##### sessionId

`string`

#### Returns

`void`

---

### endSessionTracking()

> **endSessionTracking**(`sessionId`): `Promise`\<[`PerformanceAnalysis`](../../types/interfaces/PerformanceAnalysis.md)\>

Defined in: [performance/PerformanceTrackingModule.ts:159](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L159)

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`PerformanceAnalysis`](../../types/interfaces/PerformanceAnalysis.md)\>

---

### recordNoteEvent()

> **recordNoteEvent**(`data`): `Promise`\<`void`\>

Defined in: [performance/PerformanceTrackingModule.ts:187](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L187)

#### Parameters

##### data

`any`

#### Returns

`Promise`\<`void`\>

---

### generatePerformanceAnalysis()

> **generatePerformanceAnalysis**(`sessionId`): `Promise`\<[`PerformanceAnalysis`](../../types/interfaces/PerformanceAnalysis.md)\>

Defined in: [performance/PerformanceTrackingModule.ts:218](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L218)

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`PerformanceAnalysis`](../../types/interfaces/PerformanceAnalysis.md)\>

---

### getSessionData()

> **getSessionData**(`sessionId`): `Promise`\<[`PerformanceData`](../../types/interfaces/PerformanceData.md)[]\>

Defined in: [performance/PerformanceTrackingModule.ts:668](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L668)

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`PerformanceData`](../../types/interfaces/PerformanceData.md)[]\>

---

### getAnalysis()

> **getAnalysis**(`sessionId`): `Promise`\<`null` \| [`PerformanceAnalysis`](../../types/interfaces/PerformanceAnalysis.md)\>

Defined in: [performance/PerformanceTrackingModule.ts:676](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L676)

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`null` \| [`PerformanceAnalysis`](../../types/interfaces/PerformanceAnalysis.md)\>

---

### getUserStats()

> **getUserStats**(`userId`): `Promise`\<[`PerformanceMetrics`](../../types/interfaces/PerformanceMetrics.md)\>

Defined in: [performance/PerformanceTrackingModule.ts:684](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L684)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`PerformanceMetrics`](../../types/interfaces/PerformanceMetrics.md)\>

---

### onRealTimeFeedback()

> **onRealTimeFeedback**(`callback`): () => `void`

Defined in: [performance/PerformanceTrackingModule.ts:693](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L693)

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

Defined in: [performance/PerformanceTrackingModule.ts:700](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L700)

#### Parameters

##### config

`Partial`\<[`PerformanceConfig`](../../types/interfaces/PerformanceConfig.md)\>

#### Returns

`void`

---

### getConfig()

> **getConfig**(): [`PerformanceConfig`](../../types/interfaces/PerformanceConfig.md)

Defined in: [performance/PerformanceTrackingModule.ts:704](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L704)

#### Returns

[`PerformanceConfig`](../../types/interfaces/PerformanceConfig.md)

---

### clearAllData()

> **clearAllData**(): `Promise`\<`void`\>

Defined in: [performance/PerformanceTrackingModule.ts:745](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L745)

#### Returns

`Promise`\<`void`\>

---

### getCurrentSessionData()

> **getCurrentSessionData**(): [`PerformanceData`](../../types/interfaces/PerformanceData.md)[]

Defined in: [performance/PerformanceTrackingModule.ts:750](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/performance/PerformanceTrackingModule.ts#L750)

#### Returns

[`PerformanceData`](../../types/interfaces/PerformanceData.md)[]
