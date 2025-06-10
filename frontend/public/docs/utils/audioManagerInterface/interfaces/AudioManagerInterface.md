[**Mirubato API Documentation v0.1.0**](../../../README.md)

---

[Mirubato API Documentation](../../../README.md) / [utils/audioManagerInterface](../README.md) / AudioManagerInterface

# Interface: AudioManagerInterface

Defined in: [frontend/src/utils/audioManagerInterface.ts:6](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/audioManagerInterface.ts#L6)

Audio Manager Interface for dependency injection

## Subcategory

Core Interfaces

## Methods

### isInitialized()

> **isInitialized**(): `boolean`

Defined in: [frontend/src/utils/audioManagerInterface.ts:10](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/audioManagerInterface.ts#L10)

Check if audio system is initialized

#### Returns

`boolean`

---

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [frontend/src/utils/audioManagerInterface.ts:16](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/audioManagerInterface.ts#L16)

Initialize the audio system

#### Returns

`Promise`\<`void`\>

Promise that resolves when initialization is complete

---

### setInstrument()

> **setInstrument**(`instrument`): `void`

Defined in: [frontend/src/utils/audioManagerInterface.ts:22](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/audioManagerInterface.ts#L22)

Set the current instrument

#### Parameters

##### instrument

'piano' or 'guitar'

`"piano"` | `"guitar"`

#### Returns

`void`

---

### getInstrument()

> **getInstrument**(): `"piano"` \| `"guitar"`

Defined in: [frontend/src/utils/audioManagerInterface.ts:28](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/audioManagerInterface.ts#L28)

Get the current instrument

#### Returns

`"piano"` \| `"guitar"`

Current instrument type

---

### playNote()

> **playNote**(`note`, `duration?`, `velocity?`): `Promise`\<`void`\>

Defined in: [frontend/src/utils/audioManagerInterface.ts:36](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/audioManagerInterface.ts#L36)

Play a note or chord immediately

#### Parameters

##### note

Note name(s) to play (e.g., 'C4' or ['C4', 'E4', 'G4'])

`string` | `string`[]

##### duration?

`string`

Duration of the note (default: '8n')

##### velocity?

`number`

Volume/velocity (0-1, default: 0.8)

#### Returns

`Promise`\<`void`\>

---

### playNoteAt()

> **playNoteAt**(`note`, `time`, `duration?`, `velocity?`): `Promise`\<`void`\>

Defined in: [frontend/src/utils/audioManagerInterface.ts:49](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/audioManagerInterface.ts#L49)

Schedule a note to play at a specific time

#### Parameters

##### note

Note name(s) to play

`string` | `string`[]

##### time

`number`

Time to play the note (in seconds)

##### duration?

`string`

Duration of the note (default: '8n')

##### velocity?

`number`

Volume/velocity (0-1, default: 0.8)

#### Returns

`Promise`\<`void`\>

---

### isLoading()

> **isLoading**(): `boolean`

Defined in: [frontend/src/utils/audioManagerInterface.ts:60](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/audioManagerInterface.ts#L60)

Check if audio is currently loading

#### Returns

`boolean`

True if loading, false otherwise

---

### dispose()

> **dispose**(): `void`

Defined in: [frontend/src/utils/audioManagerInterface.ts:65](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/utils/audioManagerInterface.ts#L65)

Clean up audio resources

#### Returns

`void`
