[**Mirubato API Documentation v0.1.0**](../../../README.md)

---

[Mirubato API Documentation](../../../README.md) / [services/dataSync](../README.md) / DataSyncService

# Class: DataSyncService

Defined in: [frontend/src/services/dataSync.ts:71](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/services/dataSync.ts#L71)

## Constructors

### Constructor

> **new DataSyncService**(`apolloClient`): `DataSyncService`

Defined in: [frontend/src/services/dataSync.ts:72](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/services/dataSync.ts#L72)

#### Parameters

##### apolloClient

`ApolloClient`\<`unknown`\>

#### Returns

`DataSyncService`

## Methods

### syncAllPendingData()

> **syncAllPendingData**(): `Promise`\<\{ `sessionsSynced`: `number`; `logsSynced`: `number`; `errors`: `Error`[]; \}\>

Defined in: [frontend/src/services/dataSync.ts:75](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/services/dataSync.ts#L75)

#### Returns

`Promise`\<\{ `sessionsSynced`: `number`; `logsSynced`: `number`; `errors`: `Error`[]; \}\>

---

### syncUserPreferences()

> **syncUserPreferences**(`userData`): `Promise`\<`void`\>

Defined in: [frontend/src/services/dataSync.ts:223](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/services/dataSync.ts#L223)

#### Parameters

##### userData

[`LocalUserData`](../../localStorage/interfaces/LocalUserData.md)

#### Returns

`Promise`\<`void`\>

---

### checkForConflicts()

> **checkForConflicts**(): `Promise`\<\{ `hasConflicts`: `boolean`; `conflicts`: `object`[]; \}\>

Defined in: [frontend/src/services/dataSync.ts:245](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/services/dataSync.ts#L245)

#### Returns

`Promise`\<\{ `hasConflicts`: `boolean`; `conflicts`: `object`[]; \}\>
