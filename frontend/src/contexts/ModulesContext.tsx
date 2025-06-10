import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react'
import { EventBus } from '../modules/core/EventBus'
import { EventDrivenStorage } from '../modules/core/eventDrivenStorage'
import { PracticeLoggerModule } from '../modules/logger'
import { Mood } from '../modules/logger/types'
import { StorageModule } from '../modules/infrastructure/StorageModule'
import { logger } from '../utils/logger'

interface ModulesContextType {
  practiceLogger: PracticeLoggerModule | null
  storageModule: StorageModule | null
  eventBus: EventBus
  storage: EventDrivenStorage
  isInitialized: boolean
}

const ModulesContext = createContext<ModulesContextType | undefined>(undefined)

interface ModulesProviderProps {
  children: React.ReactNode
}

export const ModulesProvider: React.FC<ModulesProviderProps> = ({
  children,
}) => {
  const [practiceLogger, setPracticeLogger] =
    useState<PracticeLoggerModule | null>(null)
  const [storageModule, setStorageModule] = useState<StorageModule | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const eventBusRef = useRef<EventBus>(EventBus.getInstance())
  const storageRef = useRef<EventDrivenStorage>(new EventDrivenStorage())
  const storageModuleRef = useRef<StorageModule | null>(null)
  const practiceLoggerRef = useRef<PracticeLoggerModule | null>(null)

  useEffect(() => {
    const initializeModules = async () => {
      try {
        logger.info('Initializing app modules...')

        // Initialize StorageModule first (needed by other modules)
        const storage = new StorageModule()
        await storage.initialize()
        storageModuleRef.current = storage
        setStorageModule(storage)
        logger.info('StorageModule initialized')

        // Initialize PracticeLoggerModule
        const loggerModule = new PracticeLoggerModule(
          {
            autoSaveInterval: 30000,
            maxEntriesPerPage: 50,
            enableAutoTagging: true,
            defaultMood: Mood.NEUTRAL,
          },
          storageRef.current
        )

        await loggerModule.initialize()
        practiceLoggerRef.current = loggerModule
        setPracticeLogger(loggerModule)

        // Subscribe to module events
        eventBusRef.current.subscribe('logger:init:complete', event => {
          logger.info('PracticeLoggerModule initialized', event.metadata)
        })

        setIsInitialized(true)
        logger.info('All modules initialized successfully')
      } catch (error) {
        logger.error('Failed to initialize modules', { error })
        setIsInitialized(true) // Set to true anyway to prevent infinite loading
      }
    }

    initializeModules()

    // Cleanup function
    return () => {
      const cleanup = async () => {
        if (practiceLoggerRef.current) {
          try {
            await practiceLoggerRef.current.shutdown()
          } catch (error) {
            logger.error('Error shutting down PracticeLoggerModule', { error })
          }
        }
        if (storageModuleRef.current) {
          try {
            await storageModuleRef.current.shutdown()
          } catch (error) {
            logger.error('Error shutting down StorageModule', { error })
          }
        }
      }
      cleanup()
    }
  }, []) // Empty dependency array - only run once

  const value: ModulesContextType = {
    practiceLogger,
    storageModule,
    eventBus: eventBusRef.current,
    storage: storageRef.current,
    isInitialized,
  }

  return (
    <ModulesContext.Provider value={value}>{children}</ModulesContext.Provider>
  )
}

export const useModules = () => {
  const context = useContext(ModulesContext)
  if (context === undefined) {
    throw new Error('useModules must be used within a ModulesProvider')
  }
  return context
}
