[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/practice/PracticeSessionModule](../README.md) / PracticeSessionModule

# Class: PracticeSessionModule

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:18](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L18)

## Implements

- [`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md)

## Constructors

### Constructor

> **new PracticeSessionModule**(`config?`, `storageService?`): `PracticeSessionModule`

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:36](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L36)

#### Parameters

##### config?

`Partial`\<[`PracticeConfig`](../../types/interfaces/PracticeConfig.md)\>

##### storageService?

`any`

#### Returns

`PracticeSessionModule`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:50](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L50)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`initialize`](../../../core/types/interfaces/ModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:98](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L98)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`shutdown`](../../../core/types/interfaces/ModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:136](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L136)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`getHealth`](../../../core/types/interfaces/ModuleInterface.md#gethealth)

---

### startSession()

> **startSession**(`sheetMusicId`, `sheetMusicTitle`, `instrument`, `userId?`): `Promise`\<[`PracticeSession`](../../types/interfaces/PracticeSession.md)\>

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:156](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L156)

#### Parameters

##### sheetMusicId

`string`

##### sheetMusicTitle

`string`

##### instrument

[`Instrument`](../../../core/enumerations/Instrument.md)

##### userId?

`string`

#### Returns

`Promise`\<[`PracticeSession`](../../types/interfaces/PracticeSession.md)\>

---

### pauseSession()

> **pauseSession**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:211](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L211)

#### Returns

`Promise`\<`void`\>

---

### resumeSession()

> **resumeSession**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:232](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L232)

#### Returns

`Promise`\<`void`\>

---

### endSession()

> **endSession**(`status`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:256](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L256)

#### Parameters

##### status

[`SessionStatus`](../../../core/sharedTypes/enumerations/SessionStatus.md) = `SessionStatus.COMPLETED`

#### Returns

`Promise`\<`void`\>

---

### getCurrentSession()

> **getCurrentSession**(): `null` \| [`PracticeSession`](../../types/interfaces/PracticeSession.md)

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:308](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L308)

#### Returns

`null` \| [`PracticeSession`](../../types/interfaces/PracticeSession.md)

---

### getSessionHistory()

> **getSessionHistory**(`limit`, `offset`): `Promise`\<[`PracticeSession`](../../types/interfaces/PracticeSession.md)[]\>

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:312](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L312)

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

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:322](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L322)

#### Parameters

##### userId?

`string`

#### Returns

`Promise`\<[`PracticeStats`](../../types/interfaces/PracticeStats.md)\>

---

### applyTemplate()

> **applyTemplate**(`templateId`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:340](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L340)

#### Parameters

##### templateId

`string`

#### Returns

`Promise`\<`void`\>

---

### saveTemplate()

> **saveTemplate**(`template`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:361](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L361)

#### Parameters

##### template

[`SessionTemplate`](../../types/interfaces/SessionTemplate.md)

#### Returns

`Promise`\<`void`\>

---

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:376](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L376)

#### Parameters

##### config

`Partial`\<[`PracticeConfig`](../../types/interfaces/PracticeConfig.md)\>

#### Returns

`void`

---

### getConfig()

> **getConfig**(): [`PracticeConfig`](../../types/interfaces/PracticeConfig.md)

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:386](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L386)

#### Returns

[`PracticeConfig`](../../types/interfaces/PracticeConfig.md)

---

### onSessionStart()

> **onSessionStart**(`handler`): () => `void`

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:391](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L391)

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

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:396](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L396)

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

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:596](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L596)

#### Returns

`Promise`\<`void`\>

---

### clearStats()

> **clearStats**(`userId?`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:600](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L600)

#### Parameters

##### userId?

`string`

#### Returns

`Promise`\<`void`\>

## Properties

### name

> **name**: `string` = `'PracticeSession'`

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:19](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L19)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`name`](../../../core/types/interfaces/ModuleInterface.md#name)

---

### version

> **version**: `string` = `'1.0.0'`

Defined in: [frontend/src/modules/practice/PracticeSessionModule.ts:20](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/practice/PracticeSessionModule.ts#L20)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`version`](../../../core/types/interfaces/ModuleInterface.md#version)
