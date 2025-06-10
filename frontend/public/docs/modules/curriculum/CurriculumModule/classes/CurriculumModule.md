[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/curriculum/CurriculumModule](../README.md) / CurriculumModule

# Class: CurriculumModule

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:38](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L38)

## Implements

- [`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md)

## Constructors

### Constructor

> **new CurriculumModule**(`config`, `storageService?`): `CurriculumModule`

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:52](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L52)

#### Parameters

##### config

[`CurriculumConfig`](../../types/interfaces/CurriculumConfig.md)

##### storageService?

`any`

#### Returns

`CurriculumModule`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:63](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L63)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`initialize`](../../../core/types/interfaces/ModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:96](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L96)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`shutdown`](../../../core/types/interfaces/ModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:119](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L119)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`getHealth`](../../../core/types/interfaces/ModuleInterface.md#gethealth)

---

### createLearningPath()

> **createLearningPath**(`path`): `Promise`\<[`LearningPath`](../../types/interfaces/LearningPath.md)\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:125](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L125)

#### Parameters

##### path

`Omit`\<[`LearningPath`](../../types/interfaces/LearningPath.md), `"id"` \| `"createdAt"` \| `"updatedAt"`\>

#### Returns

`Promise`\<[`LearningPath`](../../types/interfaces/LearningPath.md)\>

---

### getActivePaths()

> **getActivePaths**(`userId`): `Promise`\<[`LearningPath`](../../types/interfaces/LearningPath.md)[]\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:158](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L158)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`LearningPath`](../../types/interfaces/LearningPath.md)[]\>

---

### updateProgress()

> **updateProgress**(`update`): `Promise`\<[`LearningPath`](../../types/interfaces/LearningPath.md)\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:180](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L180)

#### Parameters

##### update

[`ProgressUpdate`](../../types/interfaces/ProgressUpdate.md)

#### Returns

`Promise`\<[`LearningPath`](../../types/interfaces/LearningPath.md)\>

---

### addRepertoirePiece()

> **addRepertoirePiece**(`piece`): `Promise`\<[`RepertoirePiece`](../../types/interfaces/RepertoirePiece.md)\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:223](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L223)

#### Parameters

##### piece

[`RepertoirePiece`](../../types/interfaces/RepertoirePiece.md)

#### Returns

`Promise`\<[`RepertoirePiece`](../../types/interfaces/RepertoirePiece.md)\>

---

### searchRepertoire()

> **searchRepertoire**(`filters`, `pagination?`): `Promise`\<[`RepertoirePiece`](../../types/interfaces/RepertoirePiece.md)[]\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:237](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L237)

#### Parameters

##### filters

[`CurriculumFilters`](../../types/interfaces/CurriculumFilters.md)

##### pagination?

###### limit?

`number`

###### offset?

`number`

#### Returns

`Promise`\<[`RepertoirePiece`](../../types/interfaces/RepertoirePiece.md)[]\>

---

### getRecommendations()

> **getRecommendations**(`userId`, `type`): `Promise`\<[`CurriculumRecommendation`](../../types/interfaces/CurriculumRecommendation.md)[]\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:288](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L288)

#### Parameters

##### userId

`string`

##### type

`"path"` | `"resource"` | `"piece"` | `"exercise"`

#### Returns

`Promise`\<[`CurriculumRecommendation`](../../types/interfaces/CurriculumRecommendation.md)[]\>

---

### getRepertoireByDifficulty()

> **getRepertoireByDifficulty**(`minDifficulty`, `maxDifficulty`): `Promise`\<[`RepertoirePiece`](../../types/interfaces/RepertoirePiece.md)[]\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:352](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L352)

#### Parameters

##### minDifficulty

`number`

##### maxDifficulty

`number`

#### Returns

`Promise`\<[`RepertoirePiece`](../../types/interfaces/RepertoirePiece.md)[]\>

---

### importRepertoire()

> **importRepertoire**(`pieces`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:361](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L361)

#### Parameters

##### pieces

[`RepertoirePiece`](../../types/interfaces/RepertoirePiece.md)[]

#### Returns

`Promise`\<`void`\>

---

### recordAssessment()

> **recordAssessment**(`assessment`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:369](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L369)

#### Parameters

##### assessment

[`AssessmentResult`](../../types/interfaces/AssessmentResult.md)

#### Returns

`Promise`\<`void`\>

---

### getCurriculumStats()

> **getCurriculumStats**(`userId`): `Promise`\<[`CurriculumStats`](../../types/interfaces/CurriculumStats.md)\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:409](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L409)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`CurriculumStats`](../../types/interfaces/CurriculumStats.md)\>

---

### getSkillProgress()

> **getSkillProgress**(`_userId`, `skill`): `Promise`\<\{ `skill`: [`FocusArea`](../../../core/sharedTypes/enumerations/FocusArea.md); `currentLevel`: `number`; `history`: `object`[]; \}\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:455](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L455)

#### Parameters

##### \_userId

`string`

##### skill

[`FocusArea`](../../../core/sharedTypes/enumerations/FocusArea.md)

#### Returns

`Promise`\<\{ `skill`: [`FocusArea`](../../../core/sharedTypes/enumerations/FocusArea.md); `currentLevel`: `number`; `history`: `object`[]; \}\>

---

### exportCurriculum()

> **exportCurriculum**(`userId`): `Promise`\<\{ `version`: `string`; `exportDate`: `number`; `paths`: [`LearningPath`](../../types/interfaces/LearningPath.md)[]; `repertoire`: [`RepertoirePiece`](../../types/interfaces/RepertoirePiece.md)[]; \}\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:473](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L473)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<\{ `version`: `string`; `exportDate`: `number`; `paths`: [`LearningPath`](../../types/interfaces/LearningPath.md)[]; `repertoire`: [`RepertoirePiece`](../../types/interfaces/RepertoirePiece.md)[]; \}\>

---

### importCurriculum()

> **importCurriculum**(`data`, `userId`, `options?`): `Promise`\<\{ `success`: `boolean`; `imported`: \{ `paths`: `number`; `pieces`: `number`; \}; `conflicts`: `string`[]; \}\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:490](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L490)

#### Parameters

##### data

###### version

`string`

###### paths

[`LearningPath`](../../types/interfaces/LearningPath.md)[]

###### repertoire

[`RepertoirePiece`](../../types/interfaces/RepertoirePiece.md)[]

###### exportDate

`number`

##### userId

`string`

##### options?

###### overwrite?

`boolean`

#### Returns

`Promise`\<\{ `success`: `boolean`; `imported`: \{ `paths`: `number`; `pieces`: `number`; \}; `conflicts`: `string`[]; \}\>

---

### createPracticeSession()

> **createPracticeSession**(`pieceId`, `config`): `Promise`\<[`PracticeSession`](../../types/interfaces/PracticeSession.md)\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:942](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L942)

Creates a focused practice session with specific configuration

#### Parameters

##### pieceId

`string`

The piece to practice

##### config

[`PracticeConfig`](../../types/interfaces/PracticeConfig.md)

Practice configuration (measures, tempo, hands, etc.)

#### Returns

`Promise`\<[`PracticeSession`](../../types/interfaces/PracticeSession.md)\>

Promise resolving to the created practice session

---

### updatePracticeProgress()

> **updatePracticeProgress**(`sessionId`, `progress`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:991](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L991)

Updates practice progress for an active session

#### Parameters

##### sessionId

`string`

##### progress

`Partial`\<[`PracticeProgress`](../../types/interfaces/PracticeProgress.md)\>

#### Returns

`Promise`\<`void`\>

---

### generateTechnicalExercise()

> **generateTechnicalExercise**(`type`, `level`): `Promise`\<[`TechnicalExercise`](../../types/interfaces/TechnicalExercise.md)\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:1065](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L1065)

Generates a technical exercise based on type and level

#### Parameters

##### type

[`TechnicalType`](../../types/type-aliases/TechnicalType.md)

##### level

`number`

#### Returns

`Promise`\<[`TechnicalExercise`](../../types/interfaces/TechnicalExercise.md)\>

---

### evaluateDifficulty()

> **evaluateDifficulty**(`content`): `Promise`\<[`DifficultyAssessment`](../../types/interfaces/DifficultyAssessment.md)\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:1111](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L1111)

Evaluates the difficulty of a piece across multiple factors

#### Parameters

##### content

[`MusicContent`](../../types/interfaces/MusicContent.md)

#### Returns

`Promise`\<[`DifficultyAssessment`](../../types/interfaces/DifficultyAssessment.md)\>

---

### assessPerformanceReadiness()

> **assessPerformanceReadiness**(`pieceId`, `userId`): `Promise`\<[`PerformanceReadiness`](../../types/interfaces/PerformanceReadiness.md)\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:1169](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L1169)

Assesses performance readiness for a specific piece

#### Parameters

##### pieceId

`string`

##### userId

`string`

#### Returns

`Promise`\<[`PerformanceReadiness`](../../types/interfaces/PerformanceReadiness.md)\>

---

### scheduleMaintenancePractice()

> **scheduleMaintenancePractice**(`userId`): `Promise`\<[`MaintenanceSchedule`](../../types/interfaces/MaintenanceSchedule.md)[]\>

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:1241](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L1241)

Generates maintenance schedule for learned repertoire

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`MaintenanceSchedule`](../../types/interfaces/MaintenanceSchedule.md)[]\>

## Properties

### name

> `readonly` **name**: `"CurriculumModule"` = `'CurriculumModule'`

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:39](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L39)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`name`](../../../core/types/interfaces/ModuleInterface.md#name)

---

### version

> `readonly` **version**: `"1.0.0"` = `'1.0.0'`

Defined in: [frontend/src/modules/curriculum/CurriculumModule.ts:40](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/CurriculumModule.ts#L40)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`version`](../../../core/types/interfaces/ModuleInterface.md#version)
