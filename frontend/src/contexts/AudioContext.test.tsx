import React from 'react'
import { render, renderHook } from '@testing-library/react'
import { AudioProvider, useAudioManager } from './AudioContext'
import { MockAudioManager } from '../utils/mockAudioManager'
import { AudioManagerInterface } from '../utils/audioManagerInterface'

describe('AudioContext', () => {
  describe('AudioProvider', () => {
    it('should provide a default audio manager', () => {
      const TestComponent = () => {
        const audioManager = useAudioManager()
        return <div>{audioManager.getInstrument()}</div>
      }

      const { getByText } = render(
        <AudioProvider>
          <TestComponent />
        </AudioProvider>
      )

      expect(getByText('piano')).toBeInTheDocument()
    })

    it('should use provided audio manager', () => {
      const mockAudioManager = new MockAudioManager({
        defaultInstrument: 'guitar',
      })

      const TestComponent = () => {
        const audioManager = useAudioManager()
        return <div>{audioManager.getInstrument()}</div>
      }

      const { getByText } = render(
        <AudioProvider audioManager={mockAudioManager}>
          <TestComponent />
        </AudioProvider>
      )

      expect(getByText('guitar')).toBeInTheDocument()
    })

    it('should maintain the same instance across renders', () => {
      const instances: AudioManagerInterface[] = []

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
      const mockAudioManager = new MockAudioManager()

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AudioProvider audioManager={mockAudioManager}>
          {children}
        </AudioProvider>
      )

      const { result } = renderHook(() => useAudioManager(), { wrapper })

      expect(result.current).toBe(mockAudioManager)
    })

    it('should allow using audio manager methods', async () => {
      const mockAudioManager = new MockAudioManager()

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AudioProvider audioManager={mockAudioManager}>
          {children}
        </AudioProvider>
      )

      const { result } = renderHook(() => useAudioManager(), { wrapper })

      await result.current.playNote('C4')

      expect(mockAudioManager.getPlayedNotes()).toHaveLength(1)
      expect(mockAudioManager.getPlayedNotes()[0]).toEqual({
        note: 'C4',
        duration: '8n',
        velocity: 0.8,
      })
    })
  })
})
