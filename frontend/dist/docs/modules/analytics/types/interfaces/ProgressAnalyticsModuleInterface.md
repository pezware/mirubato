[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/analytics/types](../README.md) / ProgressAnalyticsModuleInterface

# Interface: ProgressAnalyticsModuleInterface

Defined in: [frontend/src/modules/analytics/types.ts:85](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/types.ts#L85)

## Extends

- [`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md)

## Methods

### getProgressReport()

> **getProgressReport**(`userId`, `timeRange`): `Promise`\<[`ProgressReport`](ProgressReport.md)\>

Defined in: [frontend/src/modules/analytics/types.ts:87](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/types.ts#L87)

#### Parameters

##### userId

`string`

##### timeRange

[`TimeRange`](TimeRange.md)

#### Returns

`Promise`\<[`ProgressReport`](ProgressReport.md)\>

---

### getWeakAreas()

> **getWeakAreas**(`userId`): `Promise`\<[`WeakArea`](WeakArea.md)[]\>

Defined in: [frontend/src/modules/analytics/types.ts:91](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/types.ts#L91)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`WeakArea`](WeakArea.md)[]\>

---

### getSuggestedFocus()

> **getSuggestedFocus**(`userId`): `Promise`\<[`FocusArea`](FocusArea.md)[]\>

Defined in: [frontend/src/modules/analytics/types.ts:92](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/types.ts#L92)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`FocusArea`](FocusArea.md)[]\>

---

### checkMilestones()

> **checkMilestones**(`sessionData`): `Promise`\<[`Milestone`](Milestone.md)[]\>

Defined in: [frontend/src/modules/analytics/types.ts:95](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/types.ts#L95)

#### Parameters

##### sessionData

[`SessionData`](SessionData.md)

#### Returns

`Promise`\<[`Milestone`](Milestone.md)[]\>

---

### getMilestoneHistory()

> **getMilestoneHistory**(`userId`): `Promise`\<[`Milestone`](Milestone.md)[]\>

Defined in: [frontend/src/modules/analytics/types.ts:96](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/types.ts#L96)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`Milestone`](Milestone.md)[]\>

---

### getAccuracyTrend()

> **getAccuracyTrend**(`userId`, `days`): `Promise`\<[`TrendData`](TrendData.md)\>

Defined in: [frontend/src/modules/analytics/types.ts:99](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/types.ts#L99)

#### Parameters

##### userId

`string`

##### days

`number`

#### Returns

`Promise`\<[`TrendData`](TrendData.md)\>

---

### getPracticeConsistency()

> **getPracticeConsistency**(`userId`): `Promise`\<[`ConsistencyMetrics`](ConsistencyMetrics.md)\>

Defined in: [frontend/src/modules/analytics/types.ts:100](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/types.ts#L100)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`ConsistencyMetrics`](ConsistencyMetrics.md)\>

---

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/core/types.ts:34](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L34)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`initialize`](../../../core/types/interfaces/ModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/core/types.ts:35](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L35)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`shutdown`](../../../core/types/interfaces/ModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [frontend/src/modules/core/types.ts:36](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L36)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Inherited from

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`getHealth`](../../../core/types/interfaces/ModuleInterface.md#gethealth)

## Properties

### name

> **name**: `string`

Defined in: [frontend/src/modules/core/types.ts:32](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L32)

#### Inherited from

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`name`](../../../core/types/interfaces/ModuleInterface.md#name)

---

### version

> **version**: `string`

Defined in: [frontend/src/modules/core/types.ts:33](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/types.ts#L33)

#### Inherited from

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`version`](../../../core/types/interfaces/ModuleInterface.md#version)
