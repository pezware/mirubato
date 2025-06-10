[**Mirubato API Documentation v0.1.0**](../../../../README.md)

---

[Mirubato API Documentation](../../../../README.md) / [modules/visualization/VisualizationModule](../README.md) / VisualizationModule

# Class: VisualizationModule

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:56](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L56)

## Implements

- [`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md)

## Constructors

### Constructor

> **new VisualizationModule**(`config`, `storageService?`): `VisualizationModule`

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:75](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L75)

#### Parameters

##### config

[`VisualizationConfig`](../../types/interfaces/VisualizationConfig.md)

##### storageService?

`any`

#### Returns

`VisualizationModule`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:92](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L92)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`initialize`](../../../core/types/interfaces/ModuleInterface.md#initialize)

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:122](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L122)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`shutdown`](../../../core/types/interfaces/ModuleInterface.md#shutdown)

---

### getHealth()

> **getHealth**(): [`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:150](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L150)

#### Returns

[`ModuleHealth`](../../../core/types/interfaces/ModuleHealth.md)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`getHealth`](../../../core/types/interfaces/ModuleInterface.md#gethealth)

---

### createChart()

> **createChart**(`spec`): `Promise`\<[`ChartSpecification`](../../types/interfaces/ChartSpecification.md) & `object`\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:156](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L156)

#### Parameters

##### spec

[`ChartSpecification`](../../types/interfaces/ChartSpecification.md) & `object`

#### Returns

`Promise`\<[`ChartSpecification`](../../types/interfaces/ChartSpecification.md) & `object`\>

---

### getUserCharts()

> **getUserCharts**(`userId`): `Promise`\<[`ChartSpecification`](../../types/interfaces/ChartSpecification.md) & `object`[]\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:185](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L185)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`ChartSpecification`](../../types/interfaces/ChartSpecification.md) & `object`[]\>

---

### updateChart()

> **updateChart**(`chartId`, `updates`): `Promise`\<[`ChartSpecification`](../../types/interfaces/ChartSpecification.md) & `object`\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:214](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L214)

#### Parameters

##### chartId

`string`

##### updates

`Partial`\<[`ChartSpecification`](../../types/interfaces/ChartSpecification.md)\>

#### Returns

`Promise`\<[`ChartSpecification`](../../types/interfaces/ChartSpecification.md) & `object`\>

---

### deleteChart()

> **deleteChart**(`chartId`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:246](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L246)

#### Parameters

##### chartId

`string`

#### Returns

`Promise`\<`void`\>

---

### processProgressData()

> **processProgressData**(`data`, `chartType`): `Promise`\<[`ChartData`](../../types/interfaces/ChartData.md)\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:267](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L267)

#### Parameters

##### data

[`ProgressVisualizationData`](../../types/interfaces/ProgressVisualizationData.md)

##### chartType

[`ChartType`](../../types/type-aliases/ChartType.md)

#### Returns

`Promise`\<[`ChartData`](../../types/interfaces/ChartData.md)\>

---

### generateHeatmapData()

> **generateHeatmapData**(`userId`, `practiceData`): `Promise`\<[`HeatmapData`](../../types/interfaces/HeatmapData.md)\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:295](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L295)

#### Parameters

##### userId

`string`

##### practiceData

`object`[]

#### Returns

`Promise`\<[`HeatmapData`](../../types/interfaces/HeatmapData.md)\>

---

### createRadarChartData()

> **createRadarChartData**(`userId`, `skillsData`): `Promise`\<[`RadarChartData`](../../types/interfaces/RadarChartData.md)\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:358](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L358)

#### Parameters

##### userId

`string`

##### skillsData

`object`[]

#### Returns

`Promise`\<[`RadarChartData`](../../types/interfaces/RadarChartData.md)\>

---

### renderChart()

> **renderChart**(`chartId`, `data`, `dimensions`): `Promise`\<`null` \| `HTMLCanvasElement`\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:399](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L399)

#### Parameters

##### chartId

`string`

##### data

[`ChartData`](../../types/interfaces/ChartData.md)

##### dimensions

###### width

`number`

###### height

`number`

#### Returns

`Promise`\<`null` \| `HTMLCanvasElement`\>

---

### exportChart()

> **exportChart**(`chartId`, `options`): `Promise`\<[`VisualizationExportResult`](../../types/interfaces/VisualizationExportResult.md)\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:481](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L481)

#### Parameters

##### chartId

`string`

##### options

[`VisualizationExportOptions`](../../types/interfaces/VisualizationExportOptions.md)

#### Returns

`Promise`\<[`VisualizationExportResult`](../../types/interfaces/VisualizationExportResult.md)\>

---

### createDashboard()

> **createDashboard**(`layoutData`): `Promise`\<[`DashboardLayout`](../../types/interfaces/DashboardLayout.md)\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:550](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L550)

#### Parameters

##### layoutData

`Omit`\<[`DashboardLayout`](../../types/interfaces/DashboardLayout.md), `"id"` \| `"createdAt"` \| `"updatedAt"`\>

#### Returns

`Promise`\<[`DashboardLayout`](../../types/interfaces/DashboardLayout.md)\>

---

### getUserDashboards()

> **getUserDashboards**(`userId`): `Promise`\<[`DashboardLayout`](../../types/interfaces/DashboardLayout.md)[]\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:573](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L573)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`DashboardLayout`](../../types/interfaces/DashboardLayout.md)[]\>

---

### updateDashboard()

> **updateDashboard**(`dashboardId`, `updates`): `Promise`\<[`DashboardLayout`](../../types/interfaces/DashboardLayout.md)\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:592](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L592)

#### Parameters

##### dashboardId

`string`

##### updates

`Partial`\<`Omit`\<[`DashboardLayout`](../../types/interfaces/DashboardLayout.md), `"id"` \| `"createdAt"`\>\>

#### Returns

`Promise`\<[`DashboardLayout`](../../types/interfaces/DashboardLayout.md)\>

---

### handleChartInteraction()

> **handleChartInteraction**(`interaction`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:626](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L626)

#### Parameters

##### interaction

[`ChartInteractionEvent`](../../types/interfaces/ChartInteractionEvent.md)

#### Returns

`Promise`\<`void`\>

---

### recordChartView()

> **recordChartView**(`chartId`): `Promise`\<`void`\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:658](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L658)

#### Parameters

##### chartId

`string`

#### Returns

`Promise`\<`void`\>

---

### getVisualizationAnalytics()

> **getVisualizationAnalytics**(`chartId`): `Promise`\<[`VisualizationAnalytics`](../../types/interfaces/VisualizationAnalytics.md)\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:674](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L674)

#### Parameters

##### chartId

`string`

#### Returns

`Promise`\<[`VisualizationAnalytics`](../../types/interfaces/VisualizationAnalytics.md)\>

---

### getPerformanceMetrics()

> **getPerformanceMetrics**(`chartId`): `Promise`\<[`VisualizationPerformanceMetrics`](../../types/interfaces/VisualizationPerformanceMetrics.md)\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:693](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L693)

#### Parameters

##### chartId

`string`

#### Returns

`Promise`\<[`VisualizationPerformanceMetrics`](../../types/interfaces/VisualizationPerformanceMetrics.md)\>

---

### adaptChartForViewport()

> **adaptChartForViewport**(`spec`, `viewport`): `Promise`\<[`ChartSpecification`](../../types/interfaces/ChartSpecification.md)\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:710](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L710)

#### Parameters

##### spec

[`ChartSpecification`](../../types/interfaces/ChartSpecification.md)

##### viewport

###### width

`number`

###### height

`number`

#### Returns

`Promise`\<[`ChartSpecification`](../../types/interfaces/ChartSpecification.md)\>

---

### generateAccessibleDescription()

> **generateAccessibleDescription**(`data`): `Promise`\<`string`\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:732](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L732)

#### Parameters

##### data

[`ChartData`](../../types/interfaces/ChartData.md)

#### Returns

`Promise`\<`string`\>

---

### getChartStyling()

> **getChartStyling**(`_chartType`): `Promise`\<[`ChartStyling`](../../types/interfaces/ChartStyling.md)\>

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:765](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L765)

#### Parameters

##### \_chartType

[`ChartType`](../../types/type-aliases/ChartType.md)

#### Returns

`Promise`\<[`ChartStyling`](../../types/interfaces/ChartStyling.md)\>

## Properties

### name

> `readonly` **name**: `"VisualizationModule"` = `'VisualizationModule'`

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:57](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L57)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`name`](../../../core/types/interfaces/ModuleInterface.md#name)

---

### version

> `readonly` **version**: `"1.0.0"` = `'1.0.0'`

Defined in: [frontend/src/modules/visualization/VisualizationModule.ts:58](https://github.com/pezware/mirubato/blob/2d26938b515bb34f096125b09f4a7f56c5ea5212/frontend/src/modules/visualization/VisualizationModule.ts#L58)

#### Implementation of

[`ModuleInterface`](../../../core/types/interfaces/ModuleInterface.md).[`version`](../../../core/types/interfaces/ModuleInterface.md#version)
