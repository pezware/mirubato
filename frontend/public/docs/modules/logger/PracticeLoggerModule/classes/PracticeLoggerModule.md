[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/logger/PracticeLoggerModule](../README.md) / PracticeLoggerModule

# Class: PracticeLoggerModule

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:19](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L19)

## Implements

- [`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md)

## Constructors

### Constructor

> **new PracticeLoggerModule**(`config?`, `storageService?`): `PracticeLoggerModule`

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:36](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L36)

#### Parameters

##### config?

[`LoggerConfig`](../../types/interfaces/LoggerConfig.md)

##### storageService?

`any`

#### Returns

`PracticeLoggerModule`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:44](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L44)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`initialize`](../../../core/types/interfaces/ModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:74](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L74)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`shutdown`](../../../core/types/interfaces/ModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:93](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L93)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`getHealth`](../../../core/types/interfaces/ModuleInterface.md#gethealth)

---

### createLogEntry()

> **createLogEntry**(`entry`): `Promise`\<[`LogbookEntry`](../../types/interfaces/LogbookEntry.md)\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:99](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L99)

#### Parameters

##### entry

`Omit`\<[`LogbookEntry`](../../types/interfaces/LogbookEntry.md), `"id"`\>

#### Returns

`Promise`\<[`LogbookEntry`](../../types/interfaces/LogbookEntry.md)\>

---

### updateLogEntry()

> **updateLogEntry**(`id`, `updates`): `Promise`\<[`LogbookEntry`](../../types/interfaces/LogbookEntry.md)\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:119](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L119)

#### Parameters

##### id

`string`

##### updates

`Partial`\<[`LogbookEntry`](../../types/interfaces/LogbookEntry.md)\>

#### Returns

`Promise`\<[`LogbookEntry`](../../types/interfaces/LogbookEntry.md)\>

---

### deleteLogEntry()

> **deleteLogEntry**(`id`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:146](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L146)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

---

### getLogEntries()

> **getLogEntries**(`filters`): `Promise`\<[`LogbookEntry`](../../types/interfaces/LogbookEntry.md)[]\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:157](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L157)

#### Parameters

##### filters

[`LogFilters`](../../types/interfaces/LogFilters.md)

#### Returns

`Promise`\<[`LogbookEntry`](../../types/interfaces/LogbookEntry.md)[]\>

---

### createGoal()

> **createGoal**(`goal`): `Promise`\<[`Goal`](../../types/interfaces/Goal.md)\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:217](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L217)

#### Parameters

##### goal

`Omit`\<[`Goal`](../../types/interfaces/Goal.md), `"id"` \| `"createdAt"` \| `"updatedAt"`\>

#### Returns

`Promise`\<[`Goal`](../../types/interfaces/Goal.md)\>

---

### updateGoalProgress()

> **updateGoalProgress**(`goalId`, `progress`): `Promise`\<[`Goal`](../../types/interfaces/Goal.md)\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:240](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L240)

#### Parameters

##### goalId

`string`

##### progress

`number`

#### Returns

`Promise`\<[`Goal`](../../types/interfaces/Goal.md)\>

---

### updateGoalMilestone()

> **updateGoalMilestone**(`goalId`, `milestoneId`, `completed`): `Promise`\<[`Goal`](../../types/interfaces/Goal.md)\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:279](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L279)

#### Parameters

##### goalId

`string`

##### milestoneId

`string`

##### completed

`boolean`

#### Returns

`Promise`\<[`Goal`](../../types/interfaces/Goal.md)\>

---

### linkEntryToGoal()

> **linkEntryToGoal**(`entryId`, `goalId`): `Promise`\<[`Goal`](../../types/interfaces/Goal.md)\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:304](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L304)

#### Parameters

##### entryId

`string`

##### goalId

`string`

#### Returns

`Promise`\<[`Goal`](../../types/interfaces/Goal.md)\>

---

### getActiveGoals()

> **getActiveGoals**(`userId`): `Promise`\<[`Goal`](../../types/interfaces/Goal.md)[]\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:321](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L321)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`Goal`](../../types/interfaces/Goal.md)[]\>

---

### exportLogs()

> **exportLogs**(`options`): `Promise`\<[`ExportResult`](../../types/interfaces/ExportResult.md)\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:338](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L338)

#### Parameters

##### options

[`ExportOptions`](../../types/interfaces/ExportOptions.md)

#### Returns

`Promise`\<[`ExportResult`](../../types/interfaces/ExportResult.md)\>

---

### generatePracticeReport()

> **generatePracticeReport**(`timeRange`): `Promise`\<[`PracticeReport`](../../types/interfaces/PracticeReport.md)\>

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:377](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L377)

#### Parameters

##### timeRange

###### startDate

`number`

###### endDate

`number`

#### Returns

`Promise`\<[`PracticeReport`](../../types/interfaces/PracticeReport.md)\>

## Properties

### name

> `readonly` **name**: `"PracticeLoggerModule"` = `'PracticeLoggerModule'`

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:20](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L20)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`name`](../../../core/types/interfaces/ModuleInterface.md#name)

---

### version

> `readonly` **version**: `"1.0.0"` = `'1.0.0'`

Defined in: [frontend/src/modules/logger/PracticeLoggerModule.ts:21](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/logger/PracticeLoggerModule.ts#L21)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`version`](../../../core/types/interfaces/ModuleInterface.md#version)
