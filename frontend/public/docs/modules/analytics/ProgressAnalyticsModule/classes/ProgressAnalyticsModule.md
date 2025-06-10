[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/analytics/ProgressAnalyticsModule](../README.md) / ProgressAnalyticsModule

# Class: ProgressAnalyticsModule

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:38](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L38)

## Implements

- [`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md)

## Constructors

### Constructor

> **new ProgressAnalyticsModule**(`eventBus`, `config?`, `storageService?`): `ProgressAnalyticsModule`

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:54](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L54)

#### Parameters

##### eventBus

[`EventBus`](../../../core/EventBus/classes/EventBus.md)

##### config?

`Partial`\<[`ProgressAnalyticsModuleConfig`](../../types/interfaces/ProgressAnalyticsModuleConfig.md)\>

##### storageService?

`any`

#### Returns

`ProgressAnalyticsModule`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:72](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L72)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`initialize`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:124](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L124)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`shutdown`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:139](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L139)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`getHealth`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#gethealth)

---

### getProgressReport()

> **getProgressReport**(`userId`, `timeRange`): `Promise`\<[`ProgressReport`](../../types/interfaces/ProgressReport.md)\>

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:158](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L158)

Generates a comprehensive progress report for a user within a specified time range

#### Parameters

##### userId

`string`

The unique identifier of the user

##### timeRange

[`TimeRange`](../../types/interfaces/TimeRange.md)

The time range for the report (start and end timestamps)

#### Returns

`Promise`\<[`ProgressReport`](../../types/interfaces/ProgressReport.md)\>

A promise that resolves to a detailed progress report

#### Example

```typescript
const report = await analytics.getProgressReport('user123', {
  start: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
  end: Date.now(),
})
```

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`getProgressReport`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#getprogressreport)

---

### getWeakAreas()

> **getWeakAreas**(`userId`): `Promise`\<[`WeakArea`](../../types/interfaces/WeakArea.md)[]\>

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:199](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L199)

Identifies areas where the user needs improvement based on performance data

#### Parameters

##### userId

`string`

The unique identifier of the user

#### Returns

`Promise`\<[`WeakArea`](../../types/interfaces/WeakArea.md)[]\>

A promise that resolves to an array of weak areas with suggestions

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`getWeakAreas`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#getweakareas)

---

### getSuggestedFocus()

> **getSuggestedFocus**(`userId`): `Promise`\<[`FocusArea`](../../types/interfaces/FocusArea.md)[]\>

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:236](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L236)

Provides personalized practice recommendations based on identified weak areas

#### Parameters

##### userId

`string`

The unique identifier of the user

#### Returns

`Promise`\<[`FocusArea`](../../types/interfaces/FocusArea.md)[]\>

A promise that resolves to prioritized focus areas with exercises

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`getSuggestedFocus`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#getsuggestedfocus)

---

### checkMilestones()

> **checkMilestones**(`sessionData`): `Promise`\<[`Milestone`](../../types/interfaces/Milestone.md)[]\>

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:253](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L253)

Checks if any milestones were achieved during a practice session

#### Parameters

##### sessionData

[`SessionData`](../../types/interfaces/SessionData.md)

The data from the completed practice session

#### Returns

`Promise`\<[`Milestone`](../../types/interfaces/Milestone.md)[]\>

A promise that resolves to an array of achieved milestones

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`checkMilestones`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#checkmilestones)

---

### getMilestoneHistory()

> **getMilestoneHistory**(`userId`): `Promise`\<[`Milestone`](../../types/interfaces/Milestone.md)[]\>

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:293](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L293)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`Milestone`](../../types/interfaces/Milestone.md)[]\>

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`getMilestoneHistory`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#getmilestonehistory)

---

### getAccuracyTrend()

> **getAccuracyTrend**(`userId`, `days`): `Promise`\<[`TrendData`](../../types/interfaces/TrendData.md)\>

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:312](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L312)

Analyzes accuracy trends over a specified number of days

#### Parameters

##### userId

`string`

The unique identifier of the user

##### days

`number`

Number of days to analyze

#### Returns

`Promise`\<[`TrendData`](../../types/interfaces/TrendData.md)\>

A promise that resolves to trend data with improvement analysis

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`getAccuracyTrend`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#getaccuracytrend)

---

### getPracticeConsistency()

> **getPracticeConsistency**(`userId`): `Promise`\<[`ConsistencyMetrics`](../../types/interfaces/ConsistencyMetrics.md)\>

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:349](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L349)

Evaluates practice consistency including streaks and session frequency

#### Parameters

##### userId

`string`

The unique identifier of the user

#### Returns

`Promise`\<[`ConsistencyMetrics`](../../types/interfaces/ConsistencyMetrics.md)\>

A promise that resolves to consistency metrics

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`getPracticeConsistency`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#getpracticeconsistency)

## Properties

### name

> **name**: `string` = `'ProgressAnalyticsModule'`

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:41](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L41)

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`name`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#name)

---

### version

> **version**: `string` = `'1.0.0'`

Defined in: [frontend/src/modules/analytics/ProgressAnalyticsModule.ts:42](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L42)

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`version`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#version)
