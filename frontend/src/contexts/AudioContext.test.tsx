import React from 'react'
import { render, renderHook } from '@testing-library/react'
import { AudioProvider, useAudioManager } from './AudioContext'
import { createMultiVoiceAudioManager } from '../utils/multiVoiceAudioManager'
import { MultiVoiceAudioManagerInterface } from '../utils/multiVoiceAudioManagerInterface'

describe('AudioContext', () => {
  describe('AudioProvider', () => {
    it('should provide a default audio manager', () => {
      const TestComponent = () => {
        const audioManager = useAudioManager()
        return <div>{audioManager ? 'has-manager' : 'no-manager'}</div>
      }

      const { getByText } = render(
        <AudioProvider>
          <TestComponent />
        </AudioProvider>
      )

      expect(getByText('has-manager')).toBeInTheDocument()
    })

    it('should use provided audio manager', () => {
      const mockAudioManager = createMultiVoiceAudioManager()

      const TestComponent = () => {
        const audioManager = useAudioManager()
        return (
          <div>{audioManager === mockAudioManager ? 'same' : 'different'}</div>
        )
      }

      const { getByText } = render(
        <AudioProvider audioManager={mockAudioManager}>
          <TestComponent />
        </AudioProvider>
      )

      expect(getByText('same')).toBeInTheDocument()
    })

    it('should maintain the same instance across renders', () => {
      const instances: MultiVoiceAudioManagerInterface[] = []

      const TestComponent = () => {
        const audioManager = useAudioManager()
        instances.push(audioManager)
        return null
      }

      const { rerender } = render(
        <AudioProvider>
          <TestComponent />
        </AudioProvider>
      )

      rerender(
        <AudioProvider>
          <TestComponent />
        </AudioProvider>
      )

      expect(instances).toHaveLength(2)
      expect(instances[0]).toBe(instances[1])
    })
  })

  describe('useAudioManager', () => {
    it('should throw error when used outside provider', () => {
      // The hook will throw an error when used outside the provider
      expect(() => {
        const TestComponent = () => {
          useAudioManager()
          return null
        }

        render(<TestComponent />)
      }).toThrow('useAudioManager must be used within an AudioProvider')
    })

    it('should return audio manager when used inside provider', () => {
      const mockAudioManager = createMultiVoiceAudioManager()

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AudioProvider audioManager={mockAudioManager}>
          {children}
        </AudioProvider>
      )

      const { result } = renderHook(() => useAudioManager(), { wrapper })

      expect(result.current).toBe(mockAudioManager)
    })

    it('should allow using audio manager methods', async () => {
      const mockAudioManager = createMultiVoiceAudioManager()

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AudioProvider audioManager={mockAudioManager}>
          {children}
        </AudioProvider>
      )

      const { result } = renderHook(() => useAudioManager(), { wrapper })

      // Test that we can call methods on the audio manager
      expect(result.current.isInitialized).toBeDefined()
      expect(result.current.playNote).toBeDefined()
      expect(result.current.playScore).toBeDefined()
    })
  })
})
