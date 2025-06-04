[**Mirubato Module Documentation v0.1.0**](../../../README.md)

---

[Mirubato Module Documentation](../../../README.md) / [practice/PracticeSessionModule](../README.md) / PracticeSessionModule

# Class: PracticeSessionModule

Defined in: [practice/PracticeSessionModule.ts:11](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L11)

## Implements

- [`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md)

## Constructors

### Constructor

> **new PracticeSessionModule**(`storageModule`, `config?`): `PracticeSessionModule`

Defined in: [practice/PracticeSessionModule.ts:29](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L29)

#### Parameters

##### storageModule

[`StorageModule`](../../../infrastructure/StorageModule/classes/StorageModule.md)

##### config?

`Partial`\<[`PracticeConfig`](../../types/interfaces/PracticeConfig.md)\>

#### Returns

`PracticeSessionModule`

## Properties

### name

> **name**: `string` = `'PracticeSession'`

Defined in: [practice/PracticeSessionModule.ts:12](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L12)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`name`](../../../core/types/interfaces/ModuleInterface.md#name)

---

### version

> **version**: `string` = `'1.0.0'`

Defined in: [practice/PracticeSessionModule.ts:13](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L13)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`version`](../../../core/types/interfaces/ModuleInterface.md#version)

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [practice/PracticeSessionModule.ts:43](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L43)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`initialize`](../../../core/types/interfaces/ModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [practice/PracticeSessionModule.ts:91](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L91)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`shutdown`](../../../core/types/interfaces/ModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [practice/PracticeSessionModule.ts:126](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L126)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`getHealth`](../../../core/types/interfaces/ModuleInterface.md#gethealth)

---

### startSession()

> **startSession**(`sheetMusicId`, `sheetMusicTitle`, `instrument`, `userId?`): `Promise`\<[`PracticeSession`](../../types/interfaces/PracticeSession.md)\>

Defined in: [practice/PracticeSessionModule.ts:146](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L146)

#### Parameters

##### sheetMusicId

`string`

##### sheetMusicTitle

`string`

##### instrument

`"piano"` | `"guitar"`

##### userId?

`string`

#### Returns

`Promise`\<[`PracticeSession`](../../types/interfaces/PracticeSession.md)\>

---

### pauseSession()

> **pauseSession**(): `Promise`\<`void`\>

Defined in: [practice/PracticeSessionModule.ts:198](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L198)

#### Returns

`Promise`\<`void`\>

---

### resumeSession()

> **resumeSession**(): `Promise`\<`void`\>

Defined in: [practice/PracticeSessionModule.ts:216](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L216)

#### Returns

`Promise`\<`void`\>

---

### endSession()

> **endSession**(`status`): `Promise`\<`void`\>

Defined in: [practice/PracticeSessionModule.ts:237](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L237)

#### Parameters

##### status

`"completed"` | `"abandoned"`

#### Returns

`Promise`\<`void`\>

---

### getCurrentSession()

> **getCurrentSession**(): `null` \| [`PracticeSession`](../../types/interfaces/PracticeSession.md)

Defined in: [practice/PracticeSessionModule.ts:285](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L285)

#### Returns

`null` \| [`PracticeSession`](../../types/interfaces/PracticeSession.md)

---

### getSessionHistory()

> **getSessionHistory**(`limit`, `offset`): `Promise`\<[`PracticeSession`](../../types/interfaces/PracticeSession.md)[]\>

Defined in: [practice/PracticeSessionModule.ts:289](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L289)

#### Parameters

##### limit

`number` = `10`

##### offset

`number` = `0`

#### Returns

`Promise`\<[`PracticeSession`](../../types/interfaces/PracticeSession.md)[]\>

---

### getStats()

> **getStats**(`userId?`): `Promise`\<[`PracticeStats`](../../types/interfaces/PracticeStats.md)\>

Defined in: [practice/PracticeSessionModule.ts:300](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L300)

#### Parameters

##### userId?

`string`

#### Returns

`Promise`\<[`PracticeStats`](../../types/interfaces/PracticeStats.md)\>

---

### applyTemplate()

> **applyTemplate**(`templateId`): `Promise`\<`void`\>

Defined in: [practice/PracticeSessionModule.ts:318](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L318)

#### Parameters

##### templateId

`string`

#### Returns

`Promise`\<`void`\>

---

### saveTemplate()

> **saveTemplate**(`template`): `Promise`\<`void`\>

Defined in: [practice/PracticeSessionModule.ts:340](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L340)

#### Parameters

##### template

[`SessionTemplate`](../../types/interfaces/SessionTemplate.md)

#### Returns

`Promise`\<`void`\>

---

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [practice/PracticeSessionModule.ts:356](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L356)

#### Parameters

##### config

`Partial`\<[`PracticeConfig`](../../types/interfaces/PracticeConfig.md)\>

#### Returns

`void`

---

### getConfig()

> **getConfig**(): [`PracticeConfig`](../../types/interfaces/PracticeConfig.md)

Defined in: [practice/PracticeSessionModule.ts:366](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L366)

#### Returns

[`PracticeConfig`](../../types/interfaces/PracticeConfig.md)

---

### onSessionStart()

> **onSessionStart**(`handler`): () => `void`

Defined in: [practice/PracticeSessionModule.ts:371](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L371)

#### Parameters

##### handler

() => `void`

#### Returns

> (): `void`

##### Returns

`void`

---

### onSessionEnd()

> **onSessionEnd**(`handler`): () => `void`

Defined in: [practice/PracticeSessionModule.ts:376](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L376)

#### Parameters

##### handler

() => `void`

#### Returns

> (): `void`

##### Returns

`void`

---

### clearHistory()

> **clearHistory**(): `Promise`\<`void`\>

Defined in: [practice/PracticeSessionModule.ts:567](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L567)

#### Returns

`Promise`\<`void`\>

---

### clearStats()

> **clearStats**(`userId?`): `Promise`\<`void`\>

Defined in: [practice/PracticeSessionModule.ts:571](https://github.com/pezware/mirubato/blob/d56eb22878a616d79b16d22983f9eddd4870718b/frontend/src/modules/practice/PracticeSessionModule.ts#L571)

#### Parameters

##### userId?

`string`

#### Returns

`Promise`\<`void`\>
