import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Autocomplete, { AutocompleteOption } from './Autocomplete'

// Mock scrollIntoView which isn't available in jsdom
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

const mockOptions: AutocompleteOption[] = [
  {
    value: 'moonlight',
    label: 'Moonlight Sonata',
    metadata: { composer: 'Beethoven' },
  },
  {
    value: 'fur-elise',
    label: 'Für Elise',
    metadata: { composer: 'Beethoven' },
  },
  {
    value: 'clair-de-lune',
    label: 'Clair de Lune',
    metadata: { composer: 'Debussy' },
  },
]

describe('Autocomplete', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    options: mockOptions,
  }

  it('should render input field', () => {
    render(<Autocomplete {...defaultProps} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should render with placeholder', () => {
    render(<Autocomplete {...defaultProps} placeholder="Search pieces..." />)
    expect(screen.getByPlaceholderText('Search pieces...')).toBeInTheDocument()
  })

  it('should call onChange when typing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Autocomplete {...defaultProps} onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), 'moon')
    expect(onChange).toHaveBeenCalled()
  })

  describe('dropdown', () => {
    it('should show dropdown on focus', async () => {
      const user = userEvent.setup()
      render(<Autocomplete {...defaultProps} />)

      await user.click(screen.getByRole('textbox'))

      await waitFor(() => {
        expect(screen.getByText('Moonlight Sonata')).toBeInTheDocument()
      })
    })

    it('should show all options', async () => {
      const user = userEvent.setup()
      render(<Autocomplete {...defaultProps} />)

      await user.click(screen.getByRole('textbox'))

      await waitFor(() => {
        expect(screen.getByText('Moonlight Sonata')).toBeInTheDocument()
      })
      expect(screen.getByText('Für Elise')).toBeInTheDocument()
      expect(screen.getByText('Clair de Lune')).toBeInTheDocument()
    })

    it('should show composer metadata', async () => {
      const user = userEvent.setup()
      render(<Autocomplete {...defaultProps} />)

      await user.click(screen.getByRole('textbox'))

      await waitFor(() => {
        // Multiple options have Beethoven as composer
        const beethovenTexts = screen.getAllByText('Beethoven')
        expect(beethovenTexts.length).toBeGreaterThan(0)
      })
    })

    it('should show loading state', async () => {
      const user = userEvent.setup()
      render(<Autocomplete {...defaultProps} isLoading={true} />)

      await user.click(screen.getByRole('textbox'))

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument()
      })
    })

    it('should show empty message when no options', async () => {
      const user = userEvent.setup()
      render(
        <Autocomplete
          {...defaultProps}
          options={[]}
          emptyMessage="No pieces found"
        />
      )

      await user.click(screen.getByRole('textbox'))

      await waitFor(() => {
        expect(screen.getByText('No pieces found')).toBeInTheDocument()
      })
    })
  })

  describe('selection', () => {
    it('should call onSelect when option is clicked', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const onSelect = vi.fn()

      render(
        <Autocomplete
          {...defaultProps}
          onChange={onChange}
          onSelect={onSelect}
        />
      )

      await user.click(screen.getByRole('textbox'))
      await waitFor(() => {
        expect(screen.getByText('Moonlight Sonata')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Moonlight Sonata'))

      expect(onChange).toHaveBeenCalledWith('moonlight')
      expect(onSelect).toHaveBeenCalledWith(mockOptions[0])
    })
  })

  describe('keyboard navigation', () => {
    it('should open dropdown on ArrowDown', async () => {
      const user = userEvent.setup()
      render(<Autocomplete {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.keyboard('{Escape}') // Close first
      await user.keyboard('{ArrowDown}')

      await waitFor(() => {
        expect(screen.getByText('Moonlight Sonata')).toBeInTheDocument()
      })
    })

    it('should close dropdown on Escape', async () => {
      const user = userEvent.setup()
      render(<Autocomplete {...defaultProps} />)

      await user.click(screen.getByRole('textbox'))
      await waitFor(() => {
        expect(screen.getByText('Moonlight Sonata')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByText('Moonlight Sonata')).not.toBeInTheDocument()
      })
    })

    it('should select on Enter', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const onSelect = vi.fn()

      render(
        <Autocomplete
          {...defaultProps}
          onChange={onChange}
          onSelect={onSelect}
        />
      )

      await user.click(screen.getByRole('textbox'))
      await user.keyboard('{ArrowDown}') // Select first item
      await user.keyboard('{Enter}')

      expect(onChange).toHaveBeenCalledWith('moonlight')
      expect(onSelect).toHaveBeenCalledWith(mockOptions[0])
    })
  })

  describe('disabled', () => {
    it('should be disabled when prop is true', () => {
      render(<Autocomplete {...defaultProps} disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('should have disabled styling', () => {
      render(<Autocomplete {...defaultProps} disabled />)
      expect(screen.getByRole('textbox')).toHaveClass('disabled:bg-gray-100')
    })
  })

  it('should apply custom className', () => {
    const { container } = render(
      <Autocomplete {...defaultProps} className="custom-autocomplete" />
    )
    expect(container.firstChild).toHaveClass('custom-autocomplete')
  })

  it('should support data-testid', () => {
    render(<Autocomplete {...defaultProps} data-testid="piece-search" />)
    expect(screen.getByTestId('piece-search')).toBeInTheDocument()
  })
})
