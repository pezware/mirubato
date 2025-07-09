#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

// Configuration
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales')

// Comprehensive translations for all remaining keys
const translations = {
  // Common namespace
  common: {
    es: {
      discard: 'Descartar',
      'duration.hms': '{{hours}}h {{minutes}}m {{seconds}}s',
      'duration.ms': '{{minutes}}m {{seconds}}s',
      'duration.s': '{{seconds}}s',
      'metronome.averageTempo': 'Tempo Promedio',
      'metronome.patterns': 'Patrones Utilizados',
      'metronome.tempoChanges': 'Cambios de Tempo',
      'practice.discardSession': 'Descartar Sesión',
      'practice.duration': 'Duración de Práctica',
      'practice.practiceSummary': 'Resumen de Práctica',
      'practice.repetitions': 'Repeticiones',
      'practice.saveToLogbook': 'Guardar en Registro',
      'practice.startPractice': 'Iniciar Práctica',
      'practice.stopPractice': 'Detener Práctica',
      saveToLogbook: 'Guardar en Registro',
    },
    fr: {
      discard: 'Annuler',
      'duration.hms': '{{hours}}h {{minutes}}m {{seconds}}s',
      'duration.ms': '{{minutes}}m {{seconds}}s',
      'duration.s': '{{seconds}}s',
      'metronome.averageTempo': 'Tempo Moyen',
      'metronome.patterns': 'Motifs Utilisés',
      'metronome.tempoChanges': 'Changements de Tempo',
      'practice.discardSession': 'Annuler la Session',
      'practice.duration': 'Durée de Pratique',
      'practice.practiceSummary': 'Résumé de Pratique',
      'practice.repetitions': 'Répétitions',
      'practice.saveToLogbook': 'Sauvegarder dans le Journal',
      'practice.startPractice': 'Commencer la Pratique',
      'practice.stopPractice': 'Arrêter la Pratique',
      saveToLogbook: 'Sauvegarder dans le Journal',
    },
    de: {
      discard: 'Verwerfen',
      'duration.hms': '{{hours}}h {{minutes}}m {{seconds}}s',
      'duration.ms': '{{minutes}}m {{seconds}}s',
      'duration.s': '{{seconds}}s',
      'metronome.averageTempo': 'Durchschnittstempo',
      'metronome.patterns': 'Verwendete Muster',
      'metronome.tempoChanges': 'Tempoänderungen',
      'practice.discardSession': 'Sitzung Verwerfen',
      'practice.duration': 'Übungsdauer',
      'practice.practiceSummary': 'Übungszusammenfassung',
      'practice.repetitions': 'Wiederholungen',
      'practice.saveToLogbook': 'Im Übungsbuch Speichern',
      'practice.startPractice': 'Übung Starten',
      'practice.stopPractice': 'Übung Beenden',
      saveToLogbook: 'Im Übungsbuch Speichern',
    },
    'zh-TW': {
      discard: '捨棄',
      'duration.hms': '{{hours}}小時 {{minutes}}分 {{seconds}}秒',
      'duration.ms': '{{minutes}}分 {{seconds}}秒',
      'duration.s': '{{seconds}}秒',
      'metronome.averageTempo': '平均節拍',
      'metronome.patterns': '使用的模式',
      'metronome.tempoChanges': '節拍變化',
      'practice.discardSession': '捨棄練習',
      'practice.duration': '練習時長',
      'practice.practiceSummary': '練習摘要',
      'practice.repetitions': '重複次數',
      'practice.saveToLogbook': '儲存至練習記錄',
      'practice.startPractice': '開始練習',
      'practice.stopPractice': '停止練習',
      saveToLogbook: '儲存至練習記錄',
    },
    'zh-CN': {
      discard: '放弃',
      'duration.hms': '{{hours}}小时 {{minutes}}分 {{seconds}}秒',
      'duration.ms': '{{minutes}}分 {{seconds}}秒',
      'duration.s': '{{seconds}}秒',
      'metronome.averageTempo': '平均节拍',
      'metronome.patterns': '使用的模式',
      'metronome.tempoChanges': '节拍变化',
      'practice.discardSession': '放弃练习',
      'practice.duration': '练习时长',
      'practice.practiceSummary': '练习摘要',
      'practice.repetitions': '重复次数',
      'practice.saveToLogbook': '保存至练习记录',
      'practice.startPractice': '开始练习',
      'practice.stopPractice': '停止练习',
      saveToLogbook: '保存至练习记录',
    },
  },

  // Auth namespace
  auth: {
    de: {
      checkYourEmail: 'Überprüfen Sie Ihre E-Mail!',
      'errors.failedToSendMagicLink':
        'Fehler beim Senden des Magic Links. Bitte versuchen Sie es erneut.',
      'errors.googleLoginFailed':
        'Google-Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.',
      'errors.invalidOrExpiredToken':
        'Dieser Link ist ungültig oder abgelaufen. Bitte melden Sie sich erneut an.',
      'errors.serverError':
        'Serverfehler. Bitte versuchen Sie es später erneut.',
      gotIt: 'Verstanden',
      orContinueWithEmail: 'Oder mit E-Mail fortfahren',
      redirectingToLogbook: 'Sie werden zu Ihrem Übungsbuch weitergeleitet...',
      signInWithGoogle: 'Mit Google anmelden',
      successfullySignedIn: 'Erfolgreich angemeldet!',
      verificationFailed: 'Verifizierung fehlgeschlagen',
      verifyingMagicLink: 'Ihr Magic Link wird verifiziert...',
    },
    'zh-TW': {
      magicLinkDescription: '我們會發送一個安全連結，讓您無需密碼即可登入。',
      sendingMagicLink: '發送中...',
    },
    'zh-CN': {
      checkYourEmail: '查看您的邮箱！',
      'errors.failedToSendMagicLink': '发送魔法链接失败。请重试。',
      'errors.googleLoginFailed': 'Google登录失败。请重试。',
      'errors.invalidOrExpiredToken': '此链接无效或已过期。请重新登录。',
      'errors.serverError': '服务器错误。请稍后重试。',
      gotIt: '知道了',
      orContinueWithEmail: '或使用邮箱继续',
      redirectingToLogbook: '正在跳转到您的练习记录...',
      signInWithGoogle: '使用Google登录',
      successfullySignedIn: '登录成功！',
      verificationFailed: '验证失败',
      verifyingMagicLink: '正在验证您的魔法链接...',
    },
  },

  // Errors namespace
  errors: {
    de: {
      deleteFailed: 'Löschen fehlgeschlagen. Bitte versuchen Sie es erneut.',
      loadFailed:
        'Laden der Daten fehlgeschlagen. Bitte aktualisieren Sie die Seite.',
      networkError: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.',
      notAuthenticated: 'Bitte melden Sie sich an, um fortzufahren.',
      saveFailed: 'Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.',
      syncFailed:
        'Synchronisierung fehlgeschlagen. Ihre Änderungen werden lokal gespeichert.',
    },
    'zh-CN': {
      deleteFailed: '删除失败。请重试。',
      loadFailed: '加载数据失败。请刷新页面。',
      networkError: '网络错误。请检查您的连接。',
      notAuthenticated: '请登录以继续。',
      saveFailed: '保存失败。请重试。',
      syncFailed: '同步失败。您的更改已在本地保存。',
    },
  },

  // Reports namespace - extensive translations
  reports: {
    es: {
      'filters.addFilter': 'Añadir Filtro',
      'filters.addFirstFilter': 'Añadir Primer Filtro',
      'filters.allTime': 'Todo el tiempo',
      'filters.clearAll': 'Limpiar Todo',
      'filters.deletePreset': 'Eliminar Preset',
      'filters.fields.autoTracked': 'Seguimiento Automático',
      'filters.fields.composer': 'Compositor',
      'filters.fields.instrument': 'Instrumento',
      'filters.fields.mood': 'Estado de Ánimo',
      'filters.fields.piece': 'Pieza',
      'filters.fields.scoreId': 'ID de Partitura',
      'filters.fields.techniques': 'Técnicas',
      'filters.last30Days': 'Últimos 30 días',
      'filters.last7Days': 'Últimos 7 días',
      'filters.noFilters': 'Sin filtros aplicados',
      'filters.noPreset': 'Sin preset seleccionado',
      'filters.operators.after': 'después de',
      'filters.operators.before': 'antes de',
      'filters.operators.between': 'entre',
      'filters.operators.contains': 'contiene',
      'filters.operators.equals': 'igual a',
      'filters.operators.greaterThan': 'mayor que',
      'filters.operators.in': 'es uno de',
      'filters.operators.is': 'es',
      'filters.operators.isEmpty': 'está vacío',
      'filters.operators.isNot': 'no es',
      'filters.operators.isNotEmpty': 'no está vacío',
      'filters.operators.lessThan': 'menor que',
      'filters.operators.notContains': 'no contiene',
      'filters.operators.notEquals': 'no es igual a',
      'filters.operators.notIn': 'no es uno de',
      'filters.operators.on': 'en',
      'filters.savePreset': 'Guardar Preset',
      'filters.savePresetModal.descriptionPlaceholder':
        'Ingrese la descripción del preset',
      'filters.savePresetModal.name': 'Nombre del Preset',
      'filters.savePresetModal.namePlaceholder': 'Ingrese el nombre del preset',
      'filters.savePresetModal.title': 'Guardar Preset de Filtro',
      'filters.title': 'Filtros',
    },
    fr: {
      'filters.addFilter': 'Ajouter un Filtre',
      'filters.addFirstFilter': 'Ajouter le Premier Filtre',
      'filters.allTime': 'Tout le temps',
      'filters.clearAll': 'Tout Effacer',
      'filters.deletePreset': 'Supprimer le Préréglage',
      'filters.fields.autoTracked': 'Suivi Automatique',
      'filters.fields.composer': 'Compositeur',
      'filters.fields.instrument': 'Instrument',
      'filters.fields.mood': 'Humeur',
      'filters.fields.piece': 'Pièce',
      'filters.fields.scoreId': 'ID de Partition',
      'filters.fields.techniques': 'Techniques',
      'filters.last30Days': '30 derniers jours',
      'filters.last7Days': '7 derniers jours',
      'filters.noFilters': 'Aucun filtre appliqué',
      'filters.noPreset': 'Aucun préréglage sélectionné',
      'filters.operators.after': 'après',
      'filters.operators.before': 'avant',
      'filters.operators.between': 'entre',
      'filters.operators.contains': 'contient',
      'filters.operators.equals': 'égal à',
      'filters.operators.greaterThan': 'supérieur à',
      'filters.operators.in': "est l'un de",
      'filters.operators.is': 'est',
      'filters.operators.isEmpty': 'est vide',
      'filters.operators.isNot': "n'est pas",
      'filters.operators.isNotEmpty': "n'est pas vide",
      'filters.operators.lessThan': 'inférieur à',
      'filters.operators.notContains': 'ne contient pas',
      'filters.operators.notEquals': "n'est pas égal à",
      'filters.operators.notIn': "n'est pas l'un de",
      'filters.operators.on': 'le',
      'filters.savePreset': 'Sauvegarder le Préréglage',
      'filters.savePresetModal.descriptionPlaceholder':
        'Entrez la description du préréglage',
      'filters.savePresetModal.name': 'Nom du Préréglage',
      'filters.savePresetModal.namePlaceholder': 'Entrez le nom du préréglage',
      'filters.savePresetModal.title': 'Sauvegarder le Préréglage de Filtre',
      'filters.title': 'Filtres',
    },
    de: {
      applyGroupingToSeeData:
        'Gruppierung anwenden, um Daten in Tabellenform anzuzeigen',
      'filter.addFilter': 'Filter hinzufügen',
      'filter.and': 'UND',
      'filter.field': 'Feld',
      'filter.operator': 'Operator',
      'filter.or': 'ODER',
      'filter.removeFilter': 'Filter entfernen',
      'filter.value': 'Wert',
      'filters.addFilter': 'Filter hinzufügen',
      'filters.addFirstFilter': 'Ersten Filter hinzufügen',
      'filters.allTime': 'Gesamte Zeit',
      'filters.clearAll': 'Alle löschen',
      'filters.deletePreset': 'Voreinstellung löschen',
      'filters.fields.autoTracked': 'Automatisch erfasst',
      'filters.fields.composer': 'Komponist',
      'filters.fields.instrument': 'Instrument',
      'filters.fields.mood': 'Stimmung',
      'filters.fields.piece': 'Stück',
      'filters.fields.scoreId': 'Partiturnummer',
      'filters.fields.techniques': 'Techniken',
      'filters.last30Days': 'Letzte 30 Tage',
      'filters.last7Days': 'Letzte 7 Tage',
      'filters.noFilters': 'Keine Filter angewendet',
      'filters.noPreset': 'Keine Voreinstellung ausgewählt',
      'filters.operators.after': 'nach',
      'filters.operators.before': 'vor',
      'filters.operators.between': 'zwischen',
      'filters.operators.contains': 'enthält',
      'filters.operators.equals': 'gleich',
      'filters.operators.greaterThan': 'größer als',
      'filters.operators.in': 'ist einer von',
      'filters.operators.is': 'ist',
      'filters.operators.isEmpty': 'ist leer',
      'filters.operators.isNot': 'ist nicht',
      'filters.operators.isNotEmpty': 'ist nicht leer',
      'filters.operators.lessThan': 'kleiner als',
      'filters.operators.notContains': 'enthält nicht',
      'filters.operators.notEquals': 'ist nicht gleich',
      'filters.operators.notIn': 'ist keiner von',
      'filters.operators.on': 'am',
      'filters.savePreset': 'Voreinstellung speichern',
      'filters.savePresetModal.descriptionPlaceholder':
        'Beschreibung der Voreinstellung eingeben',
      'filters.savePresetModal.name': 'Name der Voreinstellung',
      'filters.savePresetModal.namePlaceholder':
        'Name der Voreinstellung eingeben',
      'filters.savePresetModal.title': 'Filtervoreinstellung speichern',
      'filters.title': 'Filter',
      noEntriesFound: 'Keine Übungseinträge gefunden',
      'stats.avgPerDay': 'Durchschnitt pro Tag',
      'stats.longestDay': 'Längster Tag',
      'stats.totalDays': 'Tage gesamt',
      'stats.totalTime': 'Gesamtzeit',
    },
    'zh-TW': {
      'filters.addFilter': '新增篩選',
      'filters.addFirstFilter': '新增第一個篩選',
      'filters.allTime': '全部時間',
      'filters.clearAll': '清除全部',
      'filters.deletePreset': '刪除預設',
      'filters.fields.autoTracked': '自動追蹤',
      'filters.fields.composer': '作曲家',
      'filters.fields.instrument': '樂器',
      'filters.fields.mood': '心情',
      'filters.fields.piece': '曲目',
      'filters.fields.scoreId': '樂譜編號',
      'filters.fields.techniques': '技巧',
      'filters.last30Days': '最近30天',
      'filters.last7Days': '最近7天',
      'filters.noFilters': '未套用任何篩選',
      'filters.noPreset': '未選擇預設',
      'filters.operators.after': '之後',
      'filters.operators.before': '之前',
      'filters.operators.between': '介於',
      'filters.operators.contains': '包含',
      'filters.operators.equals': '等於',
      'filters.operators.greaterThan': '大於',
      'filters.operators.in': '是其中之一',
      'filters.operators.is': '是',
      'filters.operators.isEmpty': '為空',
      'filters.operators.isNot': '不是',
      'filters.operators.isNotEmpty': '不為空',
      'filters.operators.lessThan': '小於',
      'filters.operators.notContains': '不包含',
      'filters.operators.notEquals': '不等於',
      'filters.operators.notIn': '不是其中之一',
      'filters.operators.on': '於',
      'filters.savePreset': '儲存預設',
      'filters.savePresetModal.descriptionPlaceholder': '輸入預設描述',
      'filters.savePresetModal.name': '預設名稱',
      'filters.savePresetModal.namePlaceholder': '輸入預設名稱',
      'filters.savePresetModal.title': '儲存篩選預設',
      'filters.title': '篩選器',
    },
    'zh-CN': {
      'filters.addFilter': '添加筛选',
      'filters.addFirstFilter': '添加第一个筛选',
      'filters.allTime': '全部时间',
      'filters.clearAll': '清除全部',
      'filters.deletePreset': '删除预设',
      'filters.fields.autoTracked': '自动跟踪',
      'filters.fields.composer': '作曲家',
      'filters.fields.instrument': '乐器',
      'filters.fields.mood': '心情',
      'filters.fields.piece': '曲目',
      'filters.fields.scoreId': '乐谱编号',
      'filters.fields.techniques': '技巧',
      'filters.last30Days': '最近30天',
      'filters.last7Days': '最近7天',
      'filters.noFilters': '未应用任何筛选',
      'filters.noPreset': '未选择预设',
      'filters.operators.after': '之后',
      'filters.operators.before': '之前',
      'filters.operators.between': '介于',
      'filters.operators.contains': '包含',
      'filters.operators.equals': '等于',
      'filters.operators.greaterThan': '大于',
      'filters.operators.in': '是其中之一',
      'filters.operators.is': '是',
      'filters.operators.isEmpty': '为空',
      'filters.operators.isNot': '不是',
      'filters.operators.isNotEmpty': '不为空',
      'filters.operators.lessThan': '小于',
      'filters.operators.notContains': '不包含',
      'filters.operators.notEquals': '不等于',
      'filters.operators.notIn': '不是其中之一',
      'filters.operators.on': '于',
      'filters.savePreset': '保存预设',
      'filters.savePresetModal.descriptionPlaceholder': '输入预设描述',
      'filters.savePresetModal.name': '预设名称',
      'filters.savePresetModal.namePlaceholder': '输入预设名称',
      'filters.savePresetModal.title': '保存筛选预设',
      'filters.title': '筛选器',
    },
  },

  // Scorebook namespace
  scorebook: {
    es: {
      by: 'por',
      decreaseTempo10: 'Disminuir tempo en 10',
      decreaseVolume: 'Disminuir volumen',
      discardPractice: 'Descartar',
      increaseTempo10: 'Aumentar tempo en 10',
      increaseVolume: 'Aumentar volumen',
      'missingScore.description':
        'Esta partitura no está disponible en nuestra biblioteca.',
      'missingScore.practiceWithoutFile':
        '¡Aún puedes practicar con esta entrada de partitura y registrar tu progreso en el registro!',
      'missingScore.userMaterial':
        'Esto podría ser tu propia partitura o material de otra fuente.',
      nextPage: 'Página siguiente',
      practice: 'Practicar',
      practiceInProgress: 'Práctica en Progreso',
      practiceWarning:
        'Tienes una sesión de práctica activa. ¿Deseas guardarla antes de salir?',
      previousPage: 'Página anterior',
      savePractice: 'Guardar y Salir',
      tip: 'Consejo',
      'upload.acceptedFormats': 'PDF, JPG, PNG (máx. 10MB)',
      'upload.clickToSelect': 'Haz clic para seleccionar un archivo',
      'upload.failed': 'Error al subir. Por favor, inténtalo de nuevo.',
      'upload.fileTooLarge':
        'El archivo es demasiado grande. El tamaño máximo es 10MB',
      'upload.invalidFileType': 'Por favor selecciona un archivo PDF o imagen',
      'upload.selectFile': 'Selecciona un archivo PDF o imagen de tu partitura',
      'upload.uploadScore': 'Subir Partitura',
      'upload.uploading': 'Subiendo...',
    },
    fr: {
      addToCollection: 'Ajouter à la collection',
      by: 'par',
      decreaseTempo10: 'Diminuer le tempo de 10',
      decreaseVolume: 'Diminuer le volume',
      discardPractice: 'Annuler',
      increaseTempo10: 'Augmenter le tempo de 10',
      increaseVolume: 'Augmenter le volume',
      'missingScore.description':
        "Cette partition n'est pas disponible dans notre bibliothèque.",
      'missingScore.practiceWithoutFile':
        'Vous pouvez toujours pratiquer avec cette entrée de partition et suivre vos progrès dans le journal!',
      'missingScore.userMaterial':
        "Il peut s'agir de votre propre partition ou de matériel provenant d'une autre source.",
      nextPage: 'Page suivante',
      practice: 'Pratiquer',
      practiceInProgress: 'Pratique en cours',
      practiceWarning:
        'Vous avez une session de pratique active. Voulez-vous la sauvegarder avant de partir?',
      previousPage: 'Page précédente',
      savePractice: 'Sauvegarder et Quitter',
      tip: 'Conseil',
      'upload.acceptedFormats': 'PDF, JPG, PNG (max 10MB)',
      'upload.clickToSelect': 'Cliquez pour sélectionner un fichier',
      'upload.failed': 'Échec du téléversement. Veuillez réessayer.',
      'upload.fileTooLarge':
        'Le fichier est trop volumineux. La taille maximale est de 10MB',
      'upload.invalidFileType': 'Veuillez sélectionner un fichier PDF ou image',
      'upload.selectFile':
        'Sélectionnez un fichier PDF ou image de votre partition',
      'upload.uploadScore': 'Téléverser une Partition',
      'upload.uploading': 'Téléversement...',
    },
    de: {
      by: 'von',
      decreaseTempo10: 'Tempo um 10 verringern',
      decreaseVolume: 'Lautstärke verringern',
      discardPractice: 'Verwerfen',
      increaseTempo10: 'Tempo um 10 erhöhen',
      increaseVolume: 'Lautstärke erhöhen',
      'missingScore.description':
        'Diese Partitur ist in unserer Bibliothek nicht verfügbar.',
      'missingScore.practiceWithoutFile':
        'Sie können trotzdem mit diesem Partitureintrag üben und Ihren Fortschritt im Übungsbuch verfolgen!',
      'missingScore.userMaterial':
        'Dies könnte Ihre eigene Partitur oder Material aus einer anderen Quelle sein.',
      nextPage: 'Nächste Seite',
      practice: 'Üben',
      practiceInProgress: 'Übung läuft',
      practiceWarning:
        'Sie haben eine aktive Übungssitzung. Möchten Sie diese speichern, bevor Sie die Seite verlassen?',
      previousPage: 'Vorherige Seite',
      savePractice: 'Speichern & Beenden',
      tip: 'Tipp',
      'upload.acceptedFormats': 'PDF, JPG, PNG (max. 10MB)',
      'upload.clickToSelect': 'Klicken Sie, um eine Datei auszuwählen',
      'upload.failed': 'Upload fehlgeschlagen. Bitte versuchen Sie es erneut.',
      'upload.fileTooLarge': 'Die Datei ist zu groß. Maximale Größe ist 10MB',
      'upload.invalidFileType': 'Bitte wählen Sie eine PDF- oder Bilddatei',
      'upload.selectFile': 'Wählen Sie eine PDF- oder Bilddatei Ihrer Partitur',
      'upload.uploadScore': 'Partitur hochladen',
      'upload.uploading': 'Wird hochgeladen...',
    },
    'zh-TW': {
      by: '作者',
      decreaseTempo10: '速度減少10',
      decreaseVolume: '降低音量',
      discardPractice: '捨棄',
      increaseTempo10: '速度增加10',
      increaseVolume: '提高音量',
      'missingScore.description': '此樂譜不在我們的資料庫中。',
      'missingScore.practiceWithoutFile':
        '您仍然可以使用此樂譜項目練習並在練習記錄中追蹤進度！',
      'missingScore.userMaterial': '這可能是您自己的樂譜或來自其他來源的資料。',
      nextPage: '下一頁',
      practice: '練習',
      practiceInProgress: '練習進行中',
      practiceWarning: '您有一個進行中的練習。離開前要儲存嗎？',
      previousPage: '上一頁',
      savePractice: '儲存並退出',
      tip: '提示',
      'upload.acceptedFormats': 'PDF、JPG、PNG（最大10MB）',
      'upload.clickToSelect': '點擊選擇檔案',
      'upload.failed': '上傳失敗。請重試。',
      'upload.fileTooLarge': '檔案太大。最大為10MB',
      'upload.invalidFileType': '請選擇PDF或圖片檔案',
      'upload.selectFile': '選擇您的樂譜PDF或圖片檔案',
      'upload.uploadScore': '上傳樂譜',
      'upload.uploading': '上傳中...',
    },
    'zh-CN': {
      by: '作者',
      decreaseTempo10: '速度减少10',
      decreaseVolume: '降低音量',
      discardPractice: '放弃',
      increaseTempo10: '速度增加10',
      increaseVolume: '提高音量',
      'missingScore.description': '此乐谱不在我们的资料库中。',
      'missingScore.practiceWithoutFile':
        '您仍然可以使用此乐谱项目练习并在练习记录中跟踪进度！',
      'missingScore.userMaterial': '这可能是您自己的乐谱或来自其他来源的资料。',
      nextPage: '下一页',
      practice: '练习',
      practiceInProgress: '练习进行中',
      practiceWarning: '您有一个进行中的练习。离开前要保存吗？',
      previousPage: '上一页',
      savePractice: '保存并退出',
      tip: '提示',
      'upload.acceptedFormats': 'PDF、JPG、PNG（最大10MB）',
      'upload.clickToSelect': '点击选择文件',
      'upload.failed': '上传失败。请重试。',
      'upload.fileTooLarge': '文件太大。最大为10MB',
      'upload.invalidFileType': '请选择PDF或图片文件',
      'upload.selectFile': '选择您的乐谱PDF或图片文件',
      'upload.uploadScore': '上传乐谱',
      'upload.uploading': '上传中...',
    },
  },
}

// Helper to load JSON file
function loadJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    console.error(chalk.red(`Error loading ${filePath}:`), error.message)
    return null
  }
}

// Helper to save JSON file
function saveJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
}

// Apply translations
function applyTranslations(namespace, lang, translationMap) {
  const filePath = path.join(LOCALES_DIR, lang, `${namespace}.json`)
  const data = loadJsonFile(filePath)

  if (!data) {
    console.error(chalk.red(`Could not load ${filePath}`))
    return 0
  }

  let updated = 0

  // Recursive function to update nested values
  function updateValue(obj, path, value) {
    const keys = path.split('.')
    const lastKey = keys.pop()
    let current = obj

    for (const key of keys) {
      if (!current[key]) {
        current[key] = {}
      }
      current = current[key]
    }

    if (
      current[lastKey] &&
      current[lastKey].startsWith('[NEEDS TRANSLATION]')
    ) {
      current[lastKey] = value
      updated++
      console.log(chalk.green(`  ✓ ${path}: "${value}"`))
    }
  }

  // Apply all translations
  Object.entries(translationMap).forEach(([key, value]) => {
    updateValue(data, key, value)
  })

  if (updated > 0) {
    saveJsonFile(filePath, data)
  }

  return updated
}

// Main function
function main() {
  console.log(chalk.bold.cyan('🌐 Applying Comprehensive Translations'))
  console.log(chalk.gray('Replacing all [NEEDS TRANSLATION] markers\n'))

  let totalUpdated = 0

  // Apply translations for each namespace
  Object.entries(translations).forEach(([namespace, langTranslations]) => {
    console.log(chalk.blue(`\nNamespace: ${namespace}`))

    Object.entries(langTranslations).forEach(([lang, translationMap]) => {
      console.log(chalk.cyan(`\n${lang}:`))
      const updated = applyTranslations(namespace, lang, translationMap)
      totalUpdated += updated

      if (updated === 0) {
        console.log(chalk.gray('  No updates needed'))
      }
    })
  })

  console.log(chalk.gray('\n' + '='.repeat(60)))
  console.log(chalk.green(`✅ Total translations applied: ${totalUpdated}`))
}

// Run the script
main()
