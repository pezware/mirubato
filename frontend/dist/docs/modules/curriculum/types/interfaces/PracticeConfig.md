[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/curriculum/types](../README.md) / PracticeConfig

# Interface: PracticeConfig

Defined in: [frontend/src/modules/curriculum/types.ts:217](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L217)

## Properties

### type

> **type**: `"pattern"` \| `"section"` \| `"full"` \| `"measures"` \| `"phrase"`

Defined in: [frontend/src/modules/curriculum/types.ts:218](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L218)

---

### focus

> **focus**: `"tempo"` \| `"accuracy"` \| `"dynamics"` \| `"articulation"` \| `"memorization"`

Defined in: [frontend/src/modules/curriculum/types.ts:219](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L219)

---

### measures?

> `optional` **measures**: `object`

Defined in: [frontend/src/modules/curriculum/types.ts:220](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L220)

#### start

> **start**: `number`

#### end

> **end**: `number`

---

### hands?

> `optional` **hands**: `"both"` \| `"left"` \| `"right"` \| `"alternating"`

Defined in: [frontend/src/modules/curriculum/types.ts:221](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L221)

---

### tempo?

> `optional` **tempo**: `object`

Defined in: [frontend/src/modules/curriculum/types.ts:222](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L222)

#### start

> **start**: `number`

#### target

> **target**: `number`

#### increment

> **increment**: `number`

#### rampType

> **rampType**: `"linear"` \| `"exponential"` \| `"stepped"`

---

### repetitions?

> `optional` **repetitions**: `object`

Defined in: [frontend/src/modules/curriculum/types.ts:228](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L228)

#### target

> **target**: `number`

#### qualityThreshold

> **qualityThreshold**: `number`

#### maxAttempts

> **maxAttempts**: `number`

---

### metronome?

> `optional` **metronome**: `object`

Defined in: [frontend/src/modules/curriculum/types.ts:233](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/curriculum/types.ts#L233)

#### enabled

> **enabled**: `boolean`

#### subdivision

> **subdivision**: `"quarter"` \| `"eighth"` \| `"sixteenth"`

#### accent

> **accent**: `"all"` \| `"strong"` \| `"downbeat"`
