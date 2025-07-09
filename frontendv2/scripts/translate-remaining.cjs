#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const LOCALES_DIR = path.join(__dirname, '../src/locales')

// Translation mappings for all remaining keys
const translations = {
  // Common keys - UI elements
  active: {
    es: 'Activo',
    fr: 'Actif',
    'zh-TW': '活躍',
  },
  analytics: {
    es: 'Análisis',
    fr: 'Analytique',
    'zh-TW': '分析',
  },
  back: {
    es: 'Atrás',
    fr: 'Retour',
    'zh-TW': '返回',
  },
  calendar: {
    es: 'Calendario',
    fr: 'Calendrier',
    'zh-TW': '日曆',
  },
  collapse: {
    es: 'Contraer',
    fr: 'Réduire',
    'zh-TW': '收合',
  },
  completed: {
    es: 'Completado',
    fr: 'Terminé',
    'zh-TW': '已完成',
  },
  continue: {
    es: 'Continuar',
    fr: 'Continuer',
    'zh-TW': '繼續',
  },
  copy: {
    es: 'Copiar',
    fr: 'Copier',
    'zh-TW': '複製',
  },
  cut: {
    es: 'Cortar',
    fr: 'Couper',
    'zh-TW': '剪下',
  },
  dark: {
    es: 'Oscuro',
    fr: 'Sombre',
    'zh-TW': '深色',
  },
  dashboard: {
    es: 'Panel',
    fr: 'Tableau de bord',
    'zh-TW': '儀表板',
  },
  date: {
    es: 'Fecha',
    fr: 'Date',
    'zh-TW': '日期',
  },
  description: {
    es: 'Descripción',
    fr: 'Description',
    'zh-TW': '描述',
  },
  deselectAll: {
    es: 'Deseleccionar todo',
    fr: 'Tout désélectionner',
    'zh-TW': '取消全選',
  },
  details: {
    es: 'Detalles',
    fr: 'Détails',
    'zh-TW': '詳情',
  },
  disable: {
    es: 'Desactivar',
    fr: 'Désactiver',
    'zh-TW': '停用',
  },
  documents: {
    es: 'Documentos',
    fr: 'Documents',
    'zh-TW': '文件',
  },
  download: {
    es: 'Descargar',
    fr: 'Télécharger',
    'zh-TW': '下載',
  },
  email: {
    es: 'Correo electrónico',
    fr: 'Email',
    'zh-TW': '電子郵件',
  },
  enable: {
    es: 'Activar',
    fr: 'Activer',
    'zh-TW': '啟用',
  },
  expand: {
    es: 'Expandir',
    fr: 'Développer',
    'zh-TW': '展開',
  },
  failed: {
    es: 'Fallido',
    fr: 'Échec',
    'zh-TW': '失敗',
  },
  files: {
    es: 'Archivos',
    fr: 'Fichiers',
    'zh-TW': '檔案',
  },
  finish: {
    es: 'Finalizar',
    fr: 'Terminer',
    'zh-TW': '完成',
  },
  help: {
    es: 'Ayuda',
    fr: 'Aide',
    'zh-TW': '幫助',
  },
  hide: {
    es: 'Ocultar',
    fr: 'Masquer',
    'zh-TW': '隱藏',
  },
  history: {
    es: 'Historial',
    fr: 'Historique',
    'zh-TW': '歷史',
  },
  home: {
    es: 'Inicio',
    fr: 'Accueil',
    'zh-TW': '首頁',
  },
  inactive: {
    es: 'Inactivo',
    fr: 'Inactif',
    'zh-TW': '非活躍',
  },
  language: {
    es: 'Idioma',
    fr: 'Langue',
    'zh-TW': '語言',
  },
  less: {
    es: 'Menos',
    fr: 'Moins',
    'zh-TW': '更少',
  },
  light: {
    es: 'Claro',
    fr: 'Clair',
    'zh-TW': '淺色',
  },
  login: {
    es: 'Iniciar sesión',
    fr: 'Connexion',
    'zh-TW': '登入',
  },
  logout: {
    es: 'Cerrar sesión',
    fr: 'Déconnexion',
    'zh-TW': '登出',
  },
  logs: {
    es: 'Registros',
    fr: 'Journaux',
    'zh-TW': '日誌',
  },
  messages: {
    es: 'Mensajes',
    fr: 'Messages',
    'zh-TW': '訊息',
  },
  more: {
    es: 'Más',
    fr: 'Plus',
    'zh-TW': '更多',
  },
  name: {
    es: 'Nombre',
    fr: 'Nom',
    'zh-TW': '名稱',
  },
  notifications: {
    es: 'Notificaciones',
    fr: 'Notifications',
    'zh-TW': '通知',
  },
  off: {
    es: 'Apagado',
    fr: 'Désactivé',
    'zh-TW': '關閉',
  },
  ok: {
    es: 'OK',
    fr: 'OK',
    'zh-TW': '確定',
  },
  on: {
    es: 'Encendido',
    fr: 'Activé',
    'zh-TW': '開啟',
  },
  overview: {
    es: 'Resumen',
    fr: "Vue d'ensemble",
    'zh-TW': '概覽',
  },
  password: {
    es: 'Contraseña',
    fr: 'Mot de passe',
    'zh-TW': '密碼',
  },
  paste: {
    es: 'Pegar',
    fr: 'Coller',
    'zh-TW': '貼上',
  },
  pause: {
    es: 'Pausar',
    fr: 'Pause',
    'zh-TW': '暫停',
  },
  pending: {
    es: 'Pendiente',
    fr: 'En attente',
    'zh-TW': '待處理',
  },
  profile: {
    es: 'Perfil',
    fr: 'Profil',
    'zh-TW': '個人資料',
  },
  projects: {
    es: 'Proyectos',
    fr: 'Projets',
    'zh-TW': '專案',
  },
  redo: {
    es: 'Rehacer',
    fr: 'Refaire',
    'zh-TW': '重做',
  },
  refresh: {
    es: 'Actualizar',
    fr: 'Actualiser',
    'zh-TW': '重新整理',
  },
  register: {
    es: 'Registrarse',
    fr: "S'inscrire",
    'zh-TW': '註冊',
  },
  reports: {
    es: 'Informes',
    fr: 'Rapports',
    'zh-TW': '報告',
  },
  reset: {
    es: 'Restablecer',
    fr: 'Réinitialiser',
    'zh-TW': '重設',
  },
  resume: {
    es: 'Reanudar',
    fr: 'Reprendre',
    'zh-TW': '繼續',
  },
  select: {
    es: 'Seleccionar',
    fr: 'Sélectionner',
    'zh-TW': '選擇',
  },
  selectAll: {
    es: 'Seleccionar todo',
    fr: 'Tout sélectionner',
    'zh-TW': '全選',
  },
  settings: {
    es: 'Configuración',
    fr: 'Paramètres',
    'zh-TW': '設定',
  },
  share: {
    es: 'Compartir',
    fr: 'Partager',
    'zh-TW': '分享',
  },
  show: {
    es: 'Mostrar',
    fr: 'Afficher',
    'zh-TW': '顯示',
  },
  skip: {
    es: 'Saltar',
    fr: 'Ignorer',
    'zh-TW': '跳過',
  },
  sort: {
    es: 'Ordenar',
    fr: 'Trier',
    'zh-TW': '排序',
  },
  start: {
    es: 'Iniciar',
    fr: 'Démarrer',
    'zh-TW': '開始',
  },
  statistics: {
    es: 'Estadísticas',
    fr: 'Statistiques',
    'zh-TW': '統計',
  },
  status: {
    es: 'Estado',
    fr: 'Statut',
    'zh-TW': '狀態',
  },
  stop: {
    es: 'Detener',
    fr: 'Arrêter',
    'zh-TW': '停止',
  },
  summary: {
    es: 'Resumen',
    fr: 'Résumé',
    'zh-TW': '摘要',
  },
  system: {
    es: 'Sistema',
    fr: 'Système',
    'zh-TW': '系統',
  },
  tasks: {
    es: 'Tareas',
    fr: 'Tâches',
    'zh-TW': '任務',
  },
  theme: {
    es: 'Tema',
    fr: 'Thème',
    'zh-TW': '主題',
  },
  title: {
    es: 'Título',
    fr: 'Titre',
    'zh-TW': '標題',
  },
  toggle: {
    es: 'Alternar',
    fr: 'Basculer',
    'zh-TW': '切換',
  },
  undo: {
    es: 'Deshacer',
    fr: 'Annuler',
    'zh-TW': '復原',
  },
  update: {
    es: 'Actualizar',
    fr: 'Mettre à jour',
    'zh-TW': '更新',
  },
  upload: {
    es: 'Subir',
    fr: 'Télécharger',
    'zh-TW': '上傳',
  },
  username: {
    es: 'Nombre de usuario',
    fr: "Nom d'utilisateur",
    'zh-TW': '使用者名稱',
  },
  version: {
    es: 'Versión',
    fr: 'Version',
    'zh-TW': '版本',
  },
  view: {
    es: 'Ver',
    fr: 'Voir',
    'zh-TW': '檢視',
  },

  // Duration letters (spelling "Duration" in each language)
  'duration.0': {
    es: 'D',
    fr: 'D',
    'zh-TW': '時',
    'zh-CN': '时',
  },
  'duration.1': {
    es: 'u',
    fr: 'u',
    'zh-TW': '長',
    'zh-CN': '长',
  },
  'duration.2': {
    es: 'r',
    fr: 'r',
    'zh-CN': 'r',
  },
  'duration.3': {
    es: 'a',
    fr: 'é',
    'zh-CN': 'a',
  },
  'duration.4': {
    es: 'c',
    fr: 'e',
    'zh-CN': 't',
  },

  // Auth keys
  backToSignIn: {
    es: 'Volver a iniciar sesión',
    fr: 'Retour à la connexion',
    'zh-TW': '返回登入',
  },
  checkEmail: {
    es: 'Revisa tu correo',
    fr: 'Vérifiez votre email',
    'zh-TW': '查看您的郵箱',
  },
  continueWithEmail: {
    es: 'Continuar con correo',
    fr: 'Continuer avec email',
    'zh-TW': '使用郵箱繼續',
  },
  continueWithGoogle: {
    es: 'Continuar con Google',
    fr: 'Continuer avec Google',
    'zh-TW': '使用 Google 繼續',
  },
  didNotReceive: {
    es: '¿No recibiste el correo?',
    fr: 'Email non reçu ?',
    'zh-TW': '沒有收到郵件？',
  },
  magicLinkInstruction: {
    es: 'Haz clic en el enlace del correo para iniciar sesión. El enlace expira en 10 minutos.',
    fr: "Cliquez sur le lien dans l'email pour vous connecter. Le lien expire dans 10 minutes.",
    'zh-TW': '點擊郵件中的連結以登入。連結將在 10 分鐘後過期。',
  },
  notYou: {
    es: '¿No eres tú?',
    fr: 'Pas vous ?',
    'zh-TW': '不是您？',
  },
  pleaseTryAgain: {
    es: 'Por favor intenta de nuevo o contacta soporte si el problema persiste.',
    fr: 'Veuillez réessayer ou contacter le support si le problème persiste.',
    'zh-TW': '請重試或聯繫支援，如果問題持續存在。',
  },
  resendLink: {
    es: 'Reenviar enlace',
    fr: 'Renvoyer le lien',
    'zh-TW': '重新發送連結',
  },
  signUp: {
    es: 'Registrarse',
    fr: "S'inscrire",
    'zh-TW': '註冊',
  },
  signedInAs: {
    es: 'Conectado como {{email}}',
    fr: 'Connecté en tant que {{email}}',
    'zh-TW': '已登入為 {{email}}',
  },
  signingIn: {
    es: 'Iniciando sesión...',
    fr: 'Connexion...',
    'zh-TW': '登入中...',
  },
  signingOut: {
    es: 'Cerrando sesión...',
    fr: 'Déconnexion...',
    'zh-TW': '登出中...',
  },
  somethingWrong: {
    es: 'Algo salió mal',
    fr: 'Un problème est survenu',
    'zh-TW': '出現了問題',
  },
  switchAccount: {
    es: 'Cambiar cuenta',
    fr: 'Changer de compte',
    'zh-TW': '切換帳戶',
  },
  tokenExpired: {
    es: 'Tu enlace de inicio de sesión ha expirado',
    fr: 'Votre lien de connexion a expiré',
    'zh-TW': '您的登入連結已過期',
  },
  tokenInvalid: {
    es: 'Enlace de inicio de sesión inválido',
    fr: 'Lien de connexion invalide',
    'zh-TW': '無效的登入連結',
  },
  tryDifferentEmail: {
    es: 'Probar otro correo',
    fr: 'Essayer un autre email',
    'zh-TW': '嘗試其他郵箱',
  },
  verifying: {
    es: 'Verificando...',
    fr: 'Vérification...',
    'zh-TW': '驗證中...',
  },
  welcomeBack: {
    es: '¡Bienvenido de vuelta!',
    fr: 'Bon retour !',
    'zh-TW': '歡迎回來！',
  },

  // Error keys
  badRequest: {
    es: 'Solicitud inválida. Por favor verifica tu entrada.',
    fr: 'Requête invalide. Veuillez vérifier votre saisie.',
    'zh-TW': '無效請求。請檢查您的輸入。',
  },
  contactSupport: {
    es: 'Contactar soporte',
    fr: 'Contacter le support',
    'zh-TW': '聯絡支援',
  },
  errorDetails: {
    es: 'Detalles del error',
    fr: "Détails de l'erreur",
    'zh-TW': '錯誤詳情',
  },
  forbidden: {
    es: 'No tienes permiso para acceder a este recurso.',
    fr: "Vous n'avez pas la permission d'accéder à cette ressource.",
    'zh-TW': '您沒有存取此資源的權限。',
  },
  goBack: {
    es: 'Volver',
    fr: 'Retour',
    'zh-TW': '返回',
  },
  goHome: {
    es: 'Ir al inicio',
    fr: "Retour à l'accueil",
    'zh-TW': '返回首頁',
  },
  network: {
    es: 'Error de red. Por favor verifica tu conexión a internet.',
    fr: 'Erreur réseau. Veuillez vérifier votre connexion internet.',
    'zh-TW': '網路錯誤。請檢查您的網際網路連線。',
  },
  notFound: {
    es: 'No se encontró el recurso solicitado.',
    fr: 'La ressource demandée est introuvable.',
    'zh-TW': '未找到請求的資源。',
  },
  pageNotFound: {
    es: 'Página no encontrada',
    fr: 'Page introuvable',
    'zh-TW': '頁面未找到',
  },
  pageNotFoundDescription: {
    es: 'La página que buscas no existe.',
    fr: "La page que vous recherchez n'existe pas.",
    'zh-TW': '您尋找的頁面不存在。',
  },
  reportIssue: {
    es: 'Reportar problema',
    fr: 'Signaler un problème',
    'zh-TW': '回報問題',
  },
  serverError: {
    es: 'Error del servidor. Por favor intenta más tarde.',
    fr: 'Erreur serveur. Veuillez réessayer plus tard.',
    'zh-TW': '伺服器錯誤。請稍後重試。',
  },
  timeout: {
    es: 'Tiempo de espera agotado. Por favor intenta de nuevo.',
    fr: "Délai d'attente dépassé. Veuillez réessayer.",
    'zh-TW': '請求逾時。請重試。',
  },
  unauthorized: {
    es: 'No estás autorizado para realizar esta acción.',
    fr: "Vous n'êtes pas autorisé à effectuer cette action.",
    'zh-TW': '您沒有權限執行此操作。',
  },
  unexpectedError: {
    es: 'Ocurrió un error inesperado.',
    fr: "Une erreur inattendue s'est produite.",
    'zh-TW': '發生了意外錯誤。',
  },
  validationError: {
    es: 'Por favor verifica tu entrada e intenta de nuevo.',
    fr: 'Veuillez vérifier votre saisie et réessayer.',
    'zh-TW': '請檢查您的輸入並重試。',
  },

  // Reports - sorting keys
  'sorting.ascending': {
    de: 'Aufsteigend',
  },
  'sorting.descending': {
    de: 'Absteigend',
  },
  'sorting.direction': {
    de: 'Richtung',
  },
  'sorting.field': {
    de: 'Feld',
  },
  'sorting.sortBy': {
    de: 'Sortieren nach',
  },

  // Reports - filter letters
  'filters.3': {
    'zh-TW': '選',
    'zh-CN': '选',
  },
  'filters.4': {
    'zh-TW': '器',
    'zh-CN': '器',
  },
  'filters.5': {
    'zh-TW': '',
    'zh-CN': '',
  },
  'filters.6': {
    de: 's',
    'zh-TW': '',
    'zh-CN': '',
  },

  // Scorebook keys
  addToCollections: {
    fr: 'Ajouter aux collections (optionnel)',
  },
  createCollection: {
    fr: 'Créer une collection',
  },
  createFirstCollection: {
    fr: 'Créez votre première collection ci-dessus',
  },
  'errors.createCollection': {
    fr: 'Erreur lors de la création de la collection',
  },
  'errors.importFailed': {
    fr: "Échec de l'importation",
  },
  'errors.invalidImages': {
    fr: 'Veuillez sélectionner des fichiers image valides',
  },
  'errors.invalidPdf': {
    fr: 'Veuillez sélectionner un fichier PDF valide',
  },
  'errors.loadCollections': {
    fr: 'Erreur lors du chargement des collections',
  },
  'errors.updateCollections': {
    fr: 'Erreur lors de la mise à jour des collections',
  },
  featured: {
    fr: 'En vedette',
  },
  foundResults: {
    fr: '{{count}} partitions trouvées',
  },
  import: {
    fr: 'Importer',
  },
  importImages: {
    fr: 'Images',
  },
  importPdf: {
    fr: 'PDF',
  },
  importScore: {
    fr: 'Importer une partition',
  },
  importUrl: {
    fr: 'URL',
  },
  importUrlHelp: {
    fr: 'Entrez un lien direct vers un fichier PDF',
  },
  importUrlPlaceholder: {
    fr: "Entrez l'URL du fichier PDF...",
  },
  manageCollections: {
    fr: 'Gérer les collections',
  },
  myCollections: {
    fr: 'Mes collections',
  },
  newCollectionPlaceholder: {
    fr: 'Nom de la nouvelle collection...',
  },
  noCollections: {
    fr: 'Pas encore de collections',
  },
  noDescription: {
    fr: 'Aucune description',
  },
  noFeaturedCollections: {
    fr: 'Aucune collection en vedette',
  },
  noPublicCollections: {
    fr: 'Aucune collection publique trouvée',
  },
  noResults: {
    fr: 'Aucune partition trouvée',
  },
  noUserCollections: {
    fr: "Vous n'avez pas encore de collections",
  },
  private: {
    fr: 'Privée',
  },
  privateCollectionHelp: {
    fr: 'Vous seul pouvez voir cette collection',
  },
  public: {
    fr: 'Publique',
  },
  publicCollectionHelp: {
    fr: "D'autres peuvent découvrir et utiliser cette collection",
  },
  publicCollections: {
    fr: 'Collections publiques',
  },
  scores: {
    fr: 'Partitions',
  },
  selectImages: {
    fr: 'Sélectionner des images',
  },
  selectedImages: {
    fr: '{{count}} images sélectionnées',
  },
  shared: {
    fr: 'Partagée',
  },
  tags: {
    fr: 'Étiquettes',
  },
  typeToSearch: {
    fr: 'Tapez pour rechercher...',
  },
  uploadImagesPrompt: {
    fr: 'Déposez les fichiers image ici ou cliquez pour parcourir',
  },
  viewCollection: {
    fr: 'Voir la collection',
  },
  viewScore: {
    fr: 'Voir la partition',
  },
}

// Function to update translations
function updateTranslations() {
  let totalUpdated = 0

  Object.entries(translations).forEach(([key, langTranslations]) => {
    const keyParts = key.split('.')
    const namespace = keyParts[0]

    Object.entries(langTranslations).forEach(([lang, translation]) => {
      const filePath = path.join(LOCALES_DIR, lang, `${namespace}.json`)

      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

        // Navigate to the correct nested location
        let current = data
        for (let i = 0; i < keyParts.length - 1; i++) {
          if (!current[keyParts[i]]) {
            current[keyParts[i]] = {}
          }
          current = current[keyParts[i]]
        }

        const finalKey = keyParts[keyParts.length - 1]

        // Check if it needs translation
        if (
          current[finalKey] &&
          (current[finalKey].includes('[NEEDS TRANSLATION]') ||
            current[finalKey].includes('[NEEDS REVIEW]'))
        ) {
          current[finalKey] = translation
          totalUpdated++
        }
      }
    })
  })

  // Save all updated files
  Object.entries(translations).forEach(([key, langTranslations]) => {
    const keyParts = key.split('.')
    const namespace = keyParts[0]

    Object.entries(langTranslations).forEach(([lang, translation]) => {
      const filePath = path.join(LOCALES_DIR, lang, `${namespace}.json`)

      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
      }
    })
  })

  console.log(`\n✅ Total translations updated: ${totalUpdated}`)
}

// Run the translation update
updateTranslations()
