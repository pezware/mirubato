[**Mirubato Module Documentation v0.1.0**](../../../README.md)

---

[Mirubato Module Documentation](../../../README.md) / [analytics/ProgressAnalyticsModule](../README.md) / ProgressAnalyticsModule

# Class: ProgressAnalyticsModule

Defined in: [analytics/ProgressAnalyticsModule.ts:39](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L39)

## Implements

- [`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md)

## Constructors

### Constructor

> **new ProgressAnalyticsModule**(`eventBus`, `storageModule`, `config?`): `ProgressAnalyticsModule`

Defined in: [analytics/ProgressAnalyticsModule.ts:53](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L53)

#### Parameters

##### eventBus

[`EventBus`](../../../core/EventBus/classes/EventBus.md)

##### storageModule

[`StorageModule`](../../../infrastructure/StorageModule/classes/StorageModule.md)

##### config?

`Partial`\<[`ProgressAnalyticsModuleConfig`](../../types/interfaces/ProgressAnalyticsModuleConfig.md)\>

#### Returns

`ProgressAnalyticsModule`

## Properties

### name

> **name**: `string` = `'ProgressAnalyticsModule'`

Defined in: [analytics/ProgressAnalyticsModule.ts:42](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L42)

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`name`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#name)

---

### version

> **version**: `string` = `'1.0.0'`

Defined in: [analytics/ProgressAnalyticsModule.ts:43](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L43)

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`version`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#version)

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [analytics/ProgressAnalyticsModule.ts:70](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L70)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`initialize`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [analytics/ProgressAnalyticsModule.ts:122](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L122)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`shutdown`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [analytics/ProgressAnalyticsModule.ts:137](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L137)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Implementation of

[`ProgressAnalyticsModuleInterface`](../../types/interfaces/ProgressAnalyticsModuleInterface.md).[`getHealth`](../../types/interfaces/ProgressAnalyticsModuleInterface.md#gethealth)

---

### getProgressReport()

> **getProgressReport**(`userId`, `timeRange`): `Promise`\<[`ProgressReport`](../../types/interfaces/ProgressReport.md)\>

Defined in: [analytics/ProgressAnalyticsModule.ts:156](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L156)

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

Defined in: [analytics/ProgressAnalyticsModule.ts:197](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L197)

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

Defined in: [analytics/ProgressAnalyticsModule.ts:234](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L234)

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

Defined in: [analytics/ProgressAnalyticsModule.ts:251](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L251)

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

Defined in: [analytics/ProgressAnalyticsModule.ts:291](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L291)

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

Defined in: [analytics/ProgressAnalyticsModule.ts:310](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L310)

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

Defined in: [analytics/ProgressAnalyticsModule.ts:347](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/analytics/ProgressAnalyticsModule.ts#L347)

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
