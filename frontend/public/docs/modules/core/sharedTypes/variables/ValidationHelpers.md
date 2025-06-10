[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/core/sharedTypes](../README.md) / ValidationHelpers

# Variable: ValidationHelpers

> `const` **ValidationHelpers**: `object`

Defined in: [frontend/src/modules/core/sharedTypes.ts:161](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/core/sharedTypes.ts#L161)

## Type declaration

### isValidAccuracy()

> **isValidAccuracy**: (`accuracy`) => `boolean`

#### Parameters

##### accuracy

`number`

#### Returns

`boolean`

### isValidSkillLevel()

> **isValidSkillLevel**: (`level`) => `level is SkillLevel`

#### Parameters

##### level

`any`

#### Returns

`level is SkillLevel`

### isValidInstrument()

> **isValidInstrument**: (`instrument`) => `instrument is Instrument`

#### Parameters

##### instrument

`any`

#### Returns

`instrument is Instrument`

### isValidSessionStatus()

> **isValidSessionStatus**: (`status`) => `status is SessionStatus`

#### Parameters

##### status

`any`

#### Returns

`status is SessionStatus`

### isValidTimestamp()

> **isValidTimestamp**: (`timestamp`) => `boolean`

#### Parameters

##### timestamp

`number`

#### Returns

`boolean`
