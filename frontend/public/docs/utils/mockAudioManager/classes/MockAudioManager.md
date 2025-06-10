[**Mirubato API Documentation v0.1.0**](../../../README.md)

---

[Mirubato API Documentation](../../../README.md) / [utils/mockAudioManager](../README.md) / MockAudioManager

# Class: MockAudioManager

Defined in: [frontend/src/utils/mockAudioManager.ts:11](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/mockAudioManager.ts#L11)

Mock Audio Manager for testing

## Subcategory

Testing

## Implements

- [`AudioManagerInterface`](../../audioManagerInterface/interfaces/AudioManagerInterface.md)

## Constructors

### Constructor

> **new MockAudioManager**(`config`): `MockAudioManager`

Defined in: [frontend/src/utils/mockAudioManager.ts:22](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/mockAudioManager.ts#L22)

#### Parameters

##### config

[`AudioManagerConfig`](../../audioManagerInterface/interfaces/AudioManagerConfig.md) = `{}`

#### Returns

`MockAudioManager`

## Methods

### isInitialized()

> **isInitialized**(): `boolean`

Defined in: [frontend/src/utils/mockAudioManager.ts:26](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/mockAudioManager.ts#L26)

Check if audio system is initialized

#### Returns

`boolean`

#### Implementation of

[`AudioManagerInterface`](../../audioManagerInterface/interfaces/AudioManagerInterface.md).[`isInitialized`](../../audioManagerInterface/interfaces/AudioManagerInterface.md#isinitialized)

---

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [frontend/src/utils/mockAudioManager.ts:30](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/mockAudioManager.ts#L30)

Initialize the audio system

#### Returns

`Promise`\<`void`\>

Promise that resolves when initialization is complete

#### Implementation of

[`AudioManagerInterface`](../../audioManagerInterface/interfaces/AudioManagerInterface.md).[`initialize`](../../audioManagerInterface/interfaces/AudioManagerInterface.md#initialize)

---

### setInstrument()

> **setInstrument**(`instrument`): `void`

Defined in: [frontend/src/utils/mockAudioManager.ts:38](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/mockAudioManager.ts#L38)

Set the current instrument

#### Parameters

##### instrument

'piano' or 'guitar'

`"piano"` | `"guitar"`

#### Returns

`void`

#### Implementation of

[`AudioManagerInterface`](../../audioManagerInterface/interfaces/AudioManagerInterface.md).[`setInstrument`](../../audioManagerInterface/interfaces/AudioManagerInterface.md#setinstrument)

---

### getInstrument()

> **getInstrument**(): `"piano"` \| `"guitar"`

Defined in: [frontend/src/utils/mockAudioManager.ts:42](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/mockAudioManager.ts#L42)

Get the current instrument

#### Returns

`"piano"` \| `"guitar"`

Current instrument type

#### Implementation of

[`AudioManagerInterface`](../../audioManagerInterface/interfaces/AudioManagerInterface.md).[`getInstrument`](../../audioManagerInterface/interfaces/AudioManagerInterface.md#getinstrument)

---

### playNote()

> **playNote**(`note`, `duration`, `velocity`): `Promise`\<`void`\>

Defined in: [frontend/src/utils/mockAudioManager.ts:46](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/mockAudioManager.ts#L46)

Play a note or chord immediately

#### Parameters

##### note

Note name(s) to play (e.g., 'C4' or ['C4', 'E4', 'G4'])

`string` | `string`[]

##### duration

`string` = `'8n'`

Duration of the note (default: '8n')

##### velocity

`number` = `0.8`

Volume/velocity (0-1, default: 0.8)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`AudioManagerInterface`](../../audioManagerInterface/interfaces/AudioManagerInterface.md).[`playNote`](../../audioManagerInterface/interfaces/AudioManagerInterface.md#playnote)

---

### playNoteAt()

> **playNoteAt**(`note`, `time`, `duration`, `velocity`): `Promise`\<`void`\>

Defined in: [frontend/src/utils/mockAudioManager.ts:57](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/mockAudioManager.ts#L57)

Schedule a note to play at a specific time

#### Parameters

##### note

Note name(s) to play

`string` | `string`[]

##### time

`number`

Time to play the note (in seconds)

##### duration

`string` = `'8n'`

Duration of the note (default: '8n')

##### velocity

`number` = `0.8`

Volume/velocity (0-1, default: 0.8)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`AudioManagerInterface`](../../audioManagerInterface/interfaces/AudioManagerInterface.md).[`playNoteAt`](../../audioManagerInterface/interfaces/AudioManagerInterface.md#playnoteat)

---

### isLoading()

> **isLoading**(): `boolean`

Defined in: [frontend/src/utils/mockAudioManager.ts:69](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/mockAudioManager.ts#L69)

Check if audio is currently loading

#### Returns

`boolean`

True if loading, false otherwise

#### Implementation of

[`AudioManagerInterface`](../../audioManagerInterface/interfaces/AudioManagerInterface.md).[`isLoading`](../../audioManagerInterface/interfaces/AudioManagerInterface.md#isloading)

---

### dispose()

> **dispose**(): `void`

Defined in: [frontend/src/utils/mockAudioManager.ts:73](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/mockAudioManager.ts#L73)

Clean up audio resources

#### Returns

`void`

#### Implementation of

[`AudioManagerInterface`](../../audioManagerInterface/interfaces/AudioManagerInterface.md).[`dispose`](../../audioManagerInterface/interfaces/AudioManagerInterface.md#dispose)

---

### getPlayedNotes()

> **getPlayedNotes**(): `object`[]

Defined in: [frontend/src/utils/mockAudioManager.ts:80](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/mockAudioManager.ts#L80)

#### Returns

`object`[]

---

### clearPlayedNotes()

> **clearPlayedNotes**(): `void`

Defined in: [frontend/src/utils/mockAudioManager.ts:84](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/mockAudioManager.ts#L84)

#### Returns

`void`
