[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/curriculum/types](../README.md) / TechnicalExercise

# Interface: TechnicalExercise

Defined in: [frontend/src/modules/curriculum/types.ts:264](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L264)

## Properties

### id

> **id**: `string`

Defined in: [frontend/src/modules/curriculum/types.ts:265](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L265)

---

### name

> **name**: `string`

Defined in: [frontend/src/modules/curriculum/types.ts:266](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L266)

---

### category

> **category**: `"technique"` \| `"scale"` \| `"pattern"` \| `"arpeggio"` \| `"finger-independence"` \| `"etude"` \| `"chord"`

Defined in: [frontend/src/modules/curriculum/types.ts:267](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L267)

---

### instrument

> **instrument**: [`Instrument`](../../../core/enumerations/Instrument.md)

Defined in: [frontend/src/modules/curriculum/types.ts:275](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L275)

---

### level

> **level**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:276](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L276)

---

### key?

> `optional` **key**: `string`

Defined in: [frontend/src/modules/curriculum/types.ts:277](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L277)

---

### pattern?

> `optional` **pattern**: `string`

Defined in: [frontend/src/modules/curriculum/types.ts:278](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L278)

---

### handPosition?

> `optional` **handPosition**: `"alternating"` \| `"parallel"` \| `"contrary"`

Defined in: [frontend/src/modules/curriculum/types.ts:279](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L279)

---

### fingering?

> `optional` **fingering**: `number`[]

Defined in: [frontend/src/modules/curriculum/types.ts:280](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L280)

---

### variations?

> `optional` **variations**: [`TechnicalVariation`](TechnicalVariation.md)[]

Defined in: [frontend/src/modules/curriculum/types.ts:281](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L281)

---

### generatedContent?

> `optional` **generatedContent**: [`MusicContent`](MusicContent.md)

Defined in: [frontend/src/modules/curriculum/types.ts:282](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L282)

---

### estimatedDuration

> **estimatedDuration**: `number`

Defined in: [frontend/src/modules/curriculum/types.ts:283](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L283)

---

### metadata?

> `optional` **metadata**: `object`

Defined in: [frontend/src/modules/curriculum/types.ts:284](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L284)

#### focus

> **focus**: `string`[]

#### benefits

> **benefits**: `string`[]

#### prerequisites

> **prerequisites**: `string`[]
