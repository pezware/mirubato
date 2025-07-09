#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const LOCALES_DIR = path.join(__dirname, '../src/locales')

// Function to apply translations
function applyTranslations() {
  let totalUpdated = 0
  const filesToUpdate = new Set()

  // Common namespace translations
  const commonTranslations = {
    es: {
      active: 'Activo',
      analytics: 'Análisis',
      back: 'Atrás',
      calendar: 'Calendario',
      collapse: 'Contraer',
      completed: 'Completado',
      continue: 'Continuar',
      copy: 'Copiar',
      cut: 'Cortar',
      dark: 'Oscuro',
      dashboard: 'Panel',
      date: 'Fecha',
      description: 'Descripción',
      deselectAll: 'Deseleccionar todo',
      details: 'Detalles',
      disable: 'Desactivar',
      documents: 'Documentos',
      download: 'Descargar',
      email: 'Correo electrónico',
      enable: 'Activar',
      expand: 'Expandir',
      failed: 'Fallido',
      files: 'Archivos',
      finish: 'Finalizar',
      help: 'Ayuda',
      hide: 'Ocultar',
      history: 'Historial',
      home: 'Inicio',
      inactive: 'Inactivo',
      language: 'Idioma',
      less: 'Menos',
      light: 'Claro',
      login: 'Iniciar sesión',
      logout: 'Cerrar sesión',
      logs: 'Registros',
      messages: 'Mensajes',
      more: 'Más',
      name: 'Nombre',
      notifications: 'Notificaciones',
      off: 'Apagado',
      ok: 'OK',
      on: 'Encendido',
      overview: 'Resumen',
      password: 'Contraseña',
      paste: 'Pegar',
      pause: 'Pausar',
      pending: 'Pendiente',
      profile: 'Perfil',
      projects: 'Proyectos',
      redo: 'Rehacer',
      refresh: 'Actualizar',
      register: 'Registrarse',
      reports: 'Informes',
      reset: 'Restablecer',
      resume: 'Reanudar',
      select: 'Seleccionar',
      selectAll: 'Seleccionar todo',
      settings: 'Configuración',
      share: 'Compartir',
      show: 'Mostrar',
      skip: 'Saltar',
      sort: 'Ordenar',
      start: 'Iniciar',
      statistics: 'Estadísticas',
      status: 'Estado',
      stop: 'Detener',
      summary: 'Resumen',
      system: 'Sistema',
      tasks: 'Tareas',
      theme: 'Tema',
      title: 'Título',
      toggle: 'Alternar',
      undo: 'Deshacer',
      update: 'Actualizar',
      upload: 'Subir',
      username: 'Nombre de usuario',
      version: 'Versión',
      view: 'Ver',
      duration: {
        0: 'D',
        1: 'u',
        2: 'r',
        3: 'a',
        4: 'c',
      },
    },
    fr: {
      active: 'Actif',
      analytics: 'Analytique',
      back: 'Retour',
      calendar: 'Calendrier',
      collapse: 'Réduire',
      completed: 'Terminé',
      continue: 'Continuer',
      copy: 'Copier',
      cut: 'Couper',
      dark: 'Sombre',
      dashboard: 'Tableau de bord',
      date: 'Date',
      description: 'Description',
      deselectAll: 'Tout désélectionner',
      details: 'Détails',
      disable: 'Désactiver',
      documents: 'Documents',
      download: 'Télécharger',
      email: 'Email',
      enable: 'Activer',
      expand: 'Développer',
      failed: 'Échec',
      files: 'Fichiers',
      finish: 'Terminer',
      help: 'Aide',
      hide: 'Masquer',
      history: 'Historique',
      home: 'Accueil',
      inactive: 'Inactif',
      language: 'Langue',
      less: 'Moins',
      light: 'Clair',
      login: 'Connexion',
      logout: 'Déconnexion',
      logs: 'Journaux',
      messages: 'Messages',
      more: 'Plus',
      name: 'Nom',
      notifications: 'Notifications',
      off: 'Désactivé',
      ok: 'OK',
      on: 'Activé',
      overview: "Vue d'ensemble",
      password: 'Mot de passe',
      paste: 'Coller',
      pause: 'Pause',
      pending: 'En attente',
      profile: 'Profil',
      projects: 'Projets',
      redo: 'Refaire',
      refresh: 'Actualiser',
      register: "S'inscrire",
      reports: 'Rapports',
      reset: 'Réinitialiser',
      resume: 'Reprendre',
      select: 'Sélectionner',
      selectAll: 'Tout sélectionner',
      settings: 'Paramètres',
      share: 'Partager',
      show: 'Afficher',
      skip: 'Ignorer',
      sort: 'Trier',
      start: 'Démarrer',
      statistics: 'Statistiques',
      status: 'Statut',
      stop: 'Arrêter',
      summary: 'Résumé',
      system: 'Système',
      tasks: 'Tâches',
      theme: 'Thème',
      title: 'Titre',
      toggle: 'Basculer',
      undo: 'Annuler',
      update: 'Mettre à jour',
      upload: 'Télécharger',
      username: "Nom d'utilisateur",
      version: 'Version',
      view: 'Voir',
      duration: {
        0: 'D',
        1: 'u',
        2: 'r',
        3: 'é',
        4: 'e',
      },
    },
    'zh-TW': {
      active: '活躍',
      analytics: '分析',
      back: '返回',
      calendar: '日曆',
      collapse: '收合',
      completed: '已完成',
      continue: '繼續',
      copy: '複製',
      cut: '剪下',
      dark: '深色',
      dashboard: '儀表板',
      date: '日期',
      description: '描述',
      deselectAll: '取消全選',
      details: '詳情',
      disable: '停用',
      documents: '文件',
      download: '下載',
      email: '電子郵件',
      enable: '啟用',
      expand: '展開',
      failed: '失敗',
      files: '檔案',
      finish: '完成',
      help: '幫助',
      hide: '隱藏',
      history: '歷史',
      home: '首頁',
      inactive: '非活躍',
      language: '語言',
      less: '更少',
      light: '淺色',
      login: '登入',
      logout: '登出',
      logs: '日誌',
      messages: '訊息',
      more: '更多',
      name: '名稱',
      notifications: '通知',
      off: '關閉',
      ok: '確定',
      on: '開啟',
      overview: '概覽',
      password: '密碼',
      paste: '貼上',
      pause: '暫停',
      pending: '待處理',
      profile: '個人資料',
      projects: '專案',
      redo: '重做',
      refresh: '重新整理',
      register: '註冊',
      reports: '報告',
      reset: '重設',
      resume: '繼續',
      select: '選擇',
      selectAll: '全選',
      settings: '設定',
      share: '分享',
      show: '顯示',
      skip: '跳過',
      sort: '排序',
      start: '開始',
      statistics: '統計',
      status: '狀態',
      stop: '停止',
      summary: '摘要',
      system: '系統',
      tasks: '任務',
      theme: '主題',
      title: '標題',
      toggle: '切換',
      undo: '復原',
      update: '更新',
      upload: '上傳',
      username: '使用者名稱',
      version: '版本',
      view: '檢視',
      duration: {
        0: '時',
        1: '長',
        2: 'd',
        3: 'u',
        4: 'r',
      },
    },
    'zh-CN': {
      duration: {
        2: 'i',
        3: 'o',
        4: 'n',
      },
    },
  }

  // Process common namespace
  Object.entries(commonTranslations).forEach(([lang, translations]) => {
    const filePath = path.join(LOCALES_DIR, lang, 'common.json')
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

      Object.entries(translations).forEach(([key, value]) => {
        if (typeof value === 'object') {
          // Handle nested objects like duration
          if (!data[key]) data[key] = {}
          Object.entries(value).forEach(([subKey, subValue]) => {
            if (
              data[key][subKey] &&
              data[key][subKey].includes('[NEEDS TRANSLATION]')
            ) {
              data[key][subKey] = subValue
              totalUpdated++
            }
          })
        } else {
          if (data[key] && data[key].includes('[NEEDS TRANSLATION]')) {
            data[key] = value
            totalUpdated++
          }
        }
      })

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
      filesToUpdate.add(`${lang}/common.json`)
    }
  })

  // Auth namespace translations
  const authTranslations = {
    es: {
      backToSignIn: 'Volver a iniciar sesión',
      checkEmail: 'Revisa tu correo',
      continueWithEmail: 'Continuar con correo',
      continueWithGoogle: 'Continuar con Google',
      didNotReceive: '¿No recibiste el correo?',
      magicLinkInstruction:
        'Haz clic en el enlace del correo para iniciar sesión. El enlace expira en 10 minutos.',
      notYou: '¿No eres tú?',
      pleaseTryAgain:
        'Por favor intenta de nuevo o contacta soporte si el problema persiste.',
      resendLink: 'Reenviar enlace',
      signUp: 'Registrarse',
      signedInAs: 'Conectado como {{email}}',
      signingIn: 'Iniciando sesión...',
      signingOut: 'Cerrando sesión...',
      somethingWrong: 'Algo salió mal',
      switchAccount: 'Cambiar cuenta',
      tokenExpired: 'Tu enlace de inicio de sesión ha expirado',
      tokenInvalid: 'Enlace de inicio de sesión inválido',
      tryDifferentEmail: 'Probar otro correo',
      verifying: 'Verificando...',
      welcomeBack: '¡Bienvenido de vuelta!',
    },
    fr: {
      backToSignIn: 'Retour à la connexion',
      checkEmail: 'Vérifiez votre email',
      continueWithEmail: 'Continuer avec email',
      continueWithGoogle: 'Continuer avec Google',
      didNotReceive: 'Email non reçu ?',
      magicLinkInstruction:
        "Cliquez sur le lien dans l'email pour vous connecter. Le lien expire dans 10 minutes.",
      notYou: 'Pas vous ?',
      pleaseTryAgain:
        'Veuillez réessayer ou contacter le support si le problème persiste.',
      resendLink: 'Renvoyer le lien',
      signUp: "S'inscrire",
      signedInAs: 'Connecté en tant que {{email}}',
      signingIn: 'Connexion...',
      signingOut: 'Déconnexion...',
      somethingWrong: 'Un problème est survenu',
      switchAccount: 'Changer de compte',
      tokenExpired: 'Votre lien de connexion a expiré',
      tokenInvalid: 'Lien de connexion invalide',
      tryDifferentEmail: 'Essayer un autre email',
      verifying: 'Vérification...',
      welcomeBack: 'Bon retour !',
    },
    'zh-TW': {
      backToSignIn: '返回登入',
      checkEmail: '查看您的郵箱',
      continueWithEmail: '使用郵箱繼續',
      continueWithGoogle: '使用 Google 繼續',
      didNotReceive: '沒有收到郵件？',
      magicLinkInstruction: '點擊郵件中的連結以登入。連結將在 10 分鐘後過期。',
      notYou: '不是您？',
      pleaseTryAgain: '請重試或聯繫支援，如果問題持續存在。',
      resendLink: '重新發送連結',
      signUp: '註冊',
      signedInAs: '已登入為 {{email}}',
      signingIn: '登入中...',
      signingOut: '登出中...',
      somethingWrong: '出現了問題',
      switchAccount: '切換帳戶',
      tokenExpired: '您的登入連結已過期',
      tokenInvalid: '無效的登入連結',
      tryDifferentEmail: '嘗試其他郵箱',
      verifying: '驗證中...',
      welcomeBack: '歡迎回來！',
    },
  }

  // Process auth namespace
  Object.entries(authTranslations).forEach(([lang, translations]) => {
    const filePath = path.join(LOCALES_DIR, lang, 'auth.json')
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

      Object.entries(translations).forEach(([key, value]) => {
        if (data[key] && data[key].includes('[NEEDS TRANSLATION]')) {
          data[key] = value
          totalUpdated++
        }
      })

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
      filesToUpdate.add(`${lang}/auth.json`)
    }
  })

  // Error namespace translations
  const errorTranslations = {
    es: {
      badRequest: 'Solicitud inválida. Por favor verifica tu entrada.',
      contactSupport: 'Contactar soporte',
      errorDetails: 'Detalles del error',
      forbidden: 'No tienes permiso para acceder a este recurso.',
      goBack: 'Volver',
      goHome: 'Ir al inicio',
      network: 'Error de red. Por favor verifica tu conexión a internet.',
      notFound: 'No se encontró el recurso solicitado.',
      pageNotFound: 'Página no encontrada',
      pageNotFoundDescription: 'La página que buscas no existe.',
      reportIssue: 'Reportar problema',
      serverError: 'Error del servidor. Por favor intenta más tarde.',
      timeout: 'Tiempo de espera agotado. Por favor intenta de nuevo.',
      unauthorized: 'No estás autorizado para realizar esta acción.',
      unexpectedError: 'Ocurrió un error inesperado.',
      validationError: 'Por favor verifica tu entrada e intenta de nuevo.',
    },
    fr: {
      badRequest: 'Requête invalide. Veuillez vérifier votre saisie.',
      contactSupport: 'Contacter le support',
      errorDetails: "Détails de l'erreur",
      forbidden: "Vous n'avez pas la permission d'accéder à cette ressource.",
      goBack: 'Retour',
      goHome: "Retour à l'accueil",
      network: 'Erreur réseau. Veuillez vérifier votre connexion internet.',
      notFound: 'La ressource demandée est introuvable.',
      pageNotFound: 'Page introuvable',
      pageNotFoundDescription: "La page que vous recherchez n'existe pas.",
      reportIssue: 'Signaler un problème',
      serverError: 'Erreur serveur. Veuillez réessayer plus tard.',
      timeout: "Délai d'attente dépassé. Veuillez réessayer.",
      unauthorized: "Vous n'êtes pas autorisé à effectuer cette action.",
      unexpectedError: "Une erreur inattendue s'est produite.",
      validationError: 'Veuillez vérifier votre saisie et réessayer.',
    },
    'zh-TW': {
      badRequest: '無效請求。請檢查您的輸入。',
      contactSupport: '聯絡支援',
      errorDetails: '錯誤詳情',
      forbidden: '您沒有存取此資源的權限。',
      goBack: '返回',
      goHome: '返回首頁',
      network: '網路錯誤。請檢查您的網際網路連線。',
      notFound: '未找到請求的資源。',
      pageNotFound: '頁面未找到',
      pageNotFoundDescription: '您尋找的頁面不存在。',
      reportIssue: '回報問題',
      serverError: '伺服器錯誤。請稍後重試。',
      timeout: '請求逾時。請重試。',
      unauthorized: '您沒有權限執行此操作。',
      unexpectedError: '發生了意外錯誤。',
      validationError: '請檢查您的輸入並重試。',
    },
  }

  // Process errors namespace
  Object.entries(errorTranslations).forEach(([lang, translations]) => {
    const filePath = path.join(LOCALES_DIR, lang, 'errors.json')
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

      Object.entries(translations).forEach(([key, value]) => {
        if (data[key] && data[key].includes('[NEEDS TRANSLATION]')) {
          data[key] = value
          totalUpdated++
        }
      })

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
      filesToUpdate.add(`${lang}/errors.json`)
    }
  })

  // Reports namespace - remaining translations
  const reportsTranslations = {
    de: {
      filters: {
        6: 's',
      },
      sorting: {
        ascending: 'Aufsteigend',
        descending: 'Absteigend',
        direction: 'Richtung',
        field: 'Feld',
        sortBy: 'Sortieren nach',
      },
    },
    'zh-TW': {
      filters: {
        3: 't',
        4: 'e',
        5: 'r',
        6: 's',
      },
    },
    'zh-CN': {
      filters: {
        3: 't',
        4: 'e',
        5: 'r',
        6: 's',
      },
    },
  }

  // Process reports namespace
  Object.entries(reportsTranslations).forEach(([lang, translations]) => {
    const filePath = path.join(LOCALES_DIR, lang, 'reports.json')
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

      // Handle nested structures
      if (translations.filters) {
        Object.entries(translations.filters).forEach(([key, value]) => {
          if (
            data.filters &&
            data.filters[key] &&
            data.filters[key].includes('[NEEDS TRANSLATION]')
          ) {
            data.filters[key] = value
            totalUpdated++
          }
        })
      }

      if (translations.sorting) {
        Object.entries(translations.sorting).forEach(([key, value]) => {
          if (
            data.sorting &&
            data.sorting[key] &&
            data.sorting[key].includes('[NEEDS TRANSLATION]')
          ) {
            data.sorting[key] = value
            totalUpdated++
          }
        })
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
      filesToUpdate.add(`${lang}/reports.json`)
    }
  })

  // Scorebook namespace translations
  const scorebookTranslations = {
    fr: {
      addToCollections: 'Ajouter aux collections (optionnel)',
      createCollection: 'Créer une collection',
      createFirstCollection: 'Créez votre première collection ci-dessus',
      'errors.createCollection': 'Erreur lors de la création de la collection',
      'errors.importFailed': "Échec de l'importation",
      'errors.invalidImages':
        'Veuillez sélectionner des fichiers image valides',
      'errors.invalidPdf': 'Veuillez sélectionner un fichier PDF valide',
      'errors.loadCollections': 'Erreur lors du chargement des collections',
      'errors.updateCollections':
        'Erreur lors de la mise à jour des collections',
      featured: 'En vedette',
      foundResults: '{{count}} partitions trouvées',
      import: 'Importer',
      importImages: 'Images',
      importPdf: 'PDF',
      importScore: 'Importer une partition',
      importUrl: 'URL',
      importUrlHelp: 'Entrez un lien direct vers un fichier PDF',
      importUrlPlaceholder: "Entrez l'URL du fichier PDF...",
      manageCollections: 'Gérer les collections',
      myCollections: 'Mes collections',
      newCollectionPlaceholder: 'Nom de la nouvelle collection...',
      noCollections: 'Pas encore de collections',
      noDescription: 'Aucune description',
      noFeaturedCollections: 'Aucune collection en vedette',
      noPublicCollections: 'Aucune collection publique trouvée',
      noResults: 'Aucune partition trouvée',
      noUserCollections: "Vous n'avez pas encore de collections",
      private: 'Privée',
      privateCollectionHelp: 'Vous seul pouvez voir cette collection',
      public: 'Publique',
      publicCollectionHelp:
        "D'autres peuvent découvrir et utiliser cette collection",
      publicCollections: 'Collections publiques',
      scores: 'Partitions',
      selectImages: 'Sélectionner des images',
      selectedImages: '{{count}} images sélectionnées',
      shared: 'Partagée',
      tags: 'Étiquettes',
      typeToSearch: 'Tapez pour rechercher...',
      uploadImagesPrompt:
        'Déposez les fichiers image ici ou cliquez pour parcourir',
      viewCollection: 'Voir la collection',
      viewScore: 'Voir la partition',
    },
  }

  // Process scorebook namespace
  Object.entries(scorebookTranslations).forEach(([lang, translations]) => {
    const filePath = path.join(LOCALES_DIR, lang, 'scorebook.json')
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

      Object.entries(translations).forEach(([key, value]) => {
        // Handle nested keys like errors.createCollection
        if (key.includes('.')) {
          const parts = key.split('.')
          let current = data
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {}
            current = current[parts[i]]
          }
          const finalKey = parts[parts.length - 1]
          if (
            current[finalKey] &&
            current[finalKey].includes('[NEEDS TRANSLATION]')
          ) {
            current[finalKey] = value
            totalUpdated++
          }
        } else {
          if (data[key] && data[key].includes('[NEEDS TRANSLATION]')) {
            data[key] = value
            totalUpdated++
          }
        }
      })

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
      filesToUpdate.add(`${lang}/scorebook.json`)
    }
  })

  console.log(`\n✅ Total translations updated: ${totalUpdated}`)
  console.log('\nFiles updated:')
  filesToUpdate.forEach(file => console.log(`  - ${file}`))
}

// Run the translation update
applyTranslations()
