import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TechniqueSelector } from '../TechniqueSelector'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'logbook:entry.techniqueOptions.selectTechniques':
          'Select techniques practiced',
        'logbook:entry.techniqueOptions.scale': 'Scale',
        'logbook:entry.techniqueOptions.arpeggio': 'Arpeggio',
        'logbook:entry.techniqueOptions.octave': 'Octave',
        'logbook:entry.techniqueOptions.rhythm': 'Rhythm',
        'logbook:entry.techniqueOptions.addCustom': 'Add custom technique',
        'logbook:entry.techniqueOptions.customPlaceholder':
          'Enter custom technique name',
        'logbook:entry.techniqueOptions.customTechniques': 'Custom Techniques',
      }
      return translations[key] || key
    },
  }),
}))

// Create localStorage mock
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
  }
}

describe('TechniqueSelector', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>
  const mockOnTechniquesChange = vi.fn()

  beforeEach(() => {
    mockOnTechniquesChange.mockClear()
    localStorageMock = createLocalStorageMock()
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    })
  })

  it('should display default techniques', () => {
    render(
      <TechniqueSelector
        selectedTechniques={[]}
        onTechniquesChange={mockOnTechniquesChange}
      />
    )

    expect(screen.getByText('Scale')).toBeInTheDocument()
    expect(screen.getByText('Arpeggio')).toBeInTheDocument()
    expect(screen.getByText('Octave')).toBeInTheDocument()
    expect(screen.getByText('Rhythm')).toBeInTheDocument()
  })

  it('should toggle technique selection', () => {
    render(
      <TechniqueSelector
        selectedTechniques={[]}
        onTechniquesChange={mockOnTechniquesChange}
      />
    )

    const scaleCheckbox = screen.getByLabelText('Scale')
    fireEvent.click(scaleCheckbox)

    expect(mockOnTechniquesChange).toHaveBeenCalledWith(['scale'])
  })

  it('should add custom technique and save for future use', async () => {
    render(
      <TechniqueSelector
        selectedTechniques={[]}
        onTechniquesChange={mockOnTechniquesChange}
      />
    )

    // Click add custom button
    const addCustomButton = screen.getByText('+ Add custom technique')
    fireEvent.click(addCustomButton)

    // Enter custom technique
    const input = screen.getByPlaceholderText('Enter custom technique name')
    fireEvent.change(input, { target: { value: 'Tremolo' } })

    // Click Add button
    const addButton = screen.getByText('Add')
    fireEvent.click(addButton)

    // Check that the technique was added
    expect(mockOnTechniquesChange).toHaveBeenCalledWith(['Tremolo'])

    // Check that it was saved to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'mirubato:custom-techniques',
      '["Tremolo"]'
    )
  })

  it('should display previously saved custom techniques', () => {
    // Pre-populate localStorage with custom techniques
    localStorageMock.setItem(
      'mirubato:custom-techniques',
      JSON.stringify(['Vibrato', 'Glissando'])
    )

    render(
      <TechniqueSelector
        selectedTechniques={[]}
        onTechniquesChange={mockOnTechniquesChange}
      />
    )

    // Check that custom techniques section appears
    expect(screen.getByText('Custom Techniques')).toBeInTheDocument()
    expect(screen.getByText('Vibrato')).toBeInTheDocument()
    expect(screen.getByText('Glissando')).toBeInTheDocument()
  })

  it('should select custom techniques like default ones', () => {
    // Pre-populate localStorage with custom techniques
    localStorageMock.setItem(
      'mirubato:custom-techniques',
      JSON.stringify(['Legato'])
    )

    render(
      <TechniqueSelector
        selectedTechniques={[]}
        onTechniquesChange={mockOnTechniquesChange}
      />
    )

    const legatoCheckbox = screen.getByLabelText('Legato')
    fireEvent.click(legatoCheckbox)

    expect(mockOnTechniquesChange).toHaveBeenCalledWith(['Legato'])
  })

  it('should display selected techniques as tags', () => {
    render(
      <TechniqueSelector
        selectedTechniques={['scale', 'arpeggio', 'CustomTechnique']}
        onTechniquesChange={mockOnTechniquesChange}
      />
    )

    // Check for selected techniques section
    expect(screen.getByText('Selected techniques:')).toBeInTheDocument()

    // Check for technique tags - they should be in a container with specific class
    const tagsContainer = screen.getByText('Selected techniques:').parentElement
    const tags = tagsContainer?.querySelectorAll('.bg-sand-100')

    expect(tags).toHaveLength(3)

    // Check the content of tags
    const tagTexts = Array.from(tags || []).map(tag => tag.textContent)
    expect(tagTexts).toContain('Scale')
    expect(tagTexts).toContain('Arpeggio')
    expect(tagTexts).toContain('CustomTechnique')
  })

  it('should remove technique when clicking X on tag', () => {
    render(
      <TechniqueSelector
        selectedTechniques={['scale', 'arpeggio']}
        onTechniquesChange={mockOnTechniquesChange}
      />
    )

    // Find the tags container
    const tagsContainer = screen.getByText('Selected techniques:').parentElement
    const tags = tagsContainer?.querySelectorAll('.bg-sand-100')

    // Find the remove button in the first tag (scale)
    const firstTag = tags?.[0]
    const removeButton = firstTag?.querySelector('button')

    if (removeButton) {
      fireEvent.click(removeButton)
    }

    // Should be called with arpeggio only (scale removed)
    expect(mockOnTechniquesChange).toHaveBeenCalledWith(['arpeggio'])
  })
})
