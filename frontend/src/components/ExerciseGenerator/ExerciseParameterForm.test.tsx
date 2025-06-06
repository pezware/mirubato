import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExerciseParameterForm } from './ExerciseParameterForm'
import {
  KeySignature,
  TimeSignature,
  Clef,
} from '../../modules/sheetMusic/types'

// Mock the validation module
jest.mock('./validation', () => ({
  validateAllParameters: jest.fn(() => ({})),
  hasValidationErrors: jest.fn(() => false),
  ValidationErrors: {},
}))

describe('ExerciseParameterForm', () => {
  const mockOnGenerate = jest.fn()

  const defaultProps = {
    onGenerate: mockOnGenerate,
    isLoading: false,
  }

  beforeEach(() => {
    mockOnGenerate.mockClear()
  })

  describe('Rendering', () => {
    it('renders the form with all basic sections', () => {
      render(<ExerciseParameterForm {...defaultProps} />)

      expect(
        screen.getByRole('form', {
          name: /exercise parameter configuration form/i,
        })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: /generate exercise/i })
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Configure parameters to generate a personalized practice exercise'
        )
      ).toBeInTheDocument()

      // Check for main sections
      expect(
        screen.getByLabelText(/exercise type selection/i)
      ).toBeInTheDocument()
      expect(screen.getByLabelText(/key signature/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/time signature/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/clef/i)).toBeInTheDocument()
    })

    it('renders all exercise type options', () => {
      render(<ExerciseParameterForm {...defaultProps} />)

      expect(
        screen.getByRole('radio', {
          name: /select sight reading exercise type/i,
        })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('radio', { name: /select technical exercise type/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('radio', { name: /select rhythm exercise type/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('radio', { name: /select harmony exercise type/i })
      ).toBeInTheDocument()
    })

    it('renders with default values', () => {
      render(<ExerciseParameterForm {...defaultProps} />)

      // Check default values
      expect(screen.getByDisplayValue('C Major')).toBeInTheDocument()
      expect(screen.getByDisplayValue('4/4')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Treble')).toBeInTheDocument()
      expect(screen.getByDisplayValue('C4')).toBeInTheDocument()
      expect(screen.getByDisplayValue('C6')).toBeInTheDocument()
      expect(screen.getByDisplayValue('5')).toBeInTheDocument() // difficulty
      expect(screen.getByDisplayValue('4')).toBeInTheDocument() // measures
      expect(screen.getByDisplayValue('120')).toBeInTheDocument() // tempo
    })

    it('applies custom defaults when provided', () => {
      const customDefaults = {
        keySignature: KeySignature.G_MAJOR,
        timeSignature: TimeSignature.THREE_FOUR,
        clef: Clef.BASS,
        difficulty: 8,
        measures: 8,
        tempo: 90,
      }

      render(
        <ExerciseParameterForm {...defaultProps} defaults={customDefaults} />
      )

      expect(screen.getByDisplayValue('G Major')).toBeInTheDocument()
      expect(screen.getByDisplayValue('3/4')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Bass')).toBeInTheDocument()
      expect(screen.getByLabelText(/difficulty/i)).toHaveValue(8)
      expect(screen.getByLabelText(/measures/i)).toHaveValue(8)
      expect(screen.getByDisplayValue('90')).toBeInTheDocument() // tempo
    })
  })

  describe('Exercise Type Selection', () => {
    it('shows sight-reading options when sight-reading is selected', () => {
      render(<ExerciseParameterForm {...defaultProps} />)

      // Sight-reading should be selected by default
      expect(screen.getByText('Sight-Reading Options')).toBeInTheDocument()
      expect(screen.getByLabelText(/include accidentals/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/melodic motion/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phrase length/i)).toBeInTheDocument()
    })

    it('shows technical exercise options when technical is selected', async () => {
      render(<ExerciseParameterForm {...defaultProps} />)

      const user = userEvent.setup()

      // Click technical exercise type
      await user.click(
        screen.getByRole('radio', { name: /select technical exercise type/i })
      )

      expect(screen.getByText('Technical Exercise Options')).toBeInTheDocument()
      expect(screen.getByLabelText(/technical type/i)).toBeInTheDocument()
      expect(
        screen.getByRole('spinbutton', { name: /octaves/i })
      ).toBeInTheDocument()
      expect(screen.getByLabelText(/include descending/i)).toBeInTheDocument()
    })

    it('hides conditional sections when other exercise types are selected', async () => {
      render(<ExerciseParameterForm {...defaultProps} />)

      const user = userEvent.setup()

      // Click rhythm exercise type
      await user.click(
        screen.getByRole('radio', { name: /select rhythm exercise type/i })
      )

      expect(
        screen.queryByText('Sight-Reading Options')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText('Technical Exercise Options')
      ).not.toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('updates form state when inputs change', async () => {
      const user = userEvent.setup()
      render(<ExerciseParameterForm {...defaultProps} />)

      // Change key signature
      await user.selectOptions(
        screen.getByLabelText(/key signature/i),
        'G_MAJOR'
      )
      expect(screen.getByDisplayValue('G Major')).toBeInTheDocument()

      // Change note range
      const lowestNoteInput = screen.getByLabelText(/lowest note/i)
      await user.clear(lowestNoteInput)
      await user.type(lowestNoteInput, 'G3')
      expect(screen.getByDisplayValue('G3')).toBeInTheDocument()
    })

    it('toggles checkboxes correctly', async () => {
      const user = userEvent.setup()
      render(<ExerciseParameterForm {...defaultProps} />)

      const fingeringsCheckbox = screen.getByLabelText(/include fingerings/i)

      // Initially unchecked
      expect(fingeringsCheckbox).not.toBeChecked()

      // Click to check
      await user.click(fingeringsCheckbox)
      expect(fingeringsCheckbox).toBeChecked()

      // Click to uncheck
      await user.click(fingeringsCheckbox)
      expect(fingeringsCheckbox).not.toBeChecked()
    })

    it('toggles technical elements correctly', async () => {
      const user = userEvent.setup()
      render(<ExerciseParameterForm {...defaultProps} />)

      const scalesCheckbox = screen.getByLabelText(/scales/i)

      // Initially unchecked
      expect(scalesCheckbox).not.toBeChecked()

      // Click to check
      await user.click(scalesCheckbox)
      expect(scalesCheckbox).toBeChecked()

      // Click to uncheck
      await user.click(scalesCheckbox)
      expect(scalesCheckbox).not.toBeChecked()
    })
  })

  describe('Form Submission', () => {
    it('calls onGenerate with correct parameters for basic exercise', async () => {
      const user = userEvent.setup()
      render(<ExerciseParameterForm {...defaultProps} />)

      // Select harmony exercise type (basic exercise)
      await user.click(
        screen.getByRole('radio', { name: /select harmony exercise type/i })
      )

      // Submit form
      await user.click(
        screen.getByRole('button', { name: /generate new exercise/i })
      )

      expect(mockOnGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          keySignature: KeySignature.C_MAJOR,
          timeSignature: TimeSignature.FOUR_FOUR,
          clef: Clef.TREBLE,
          difficulty: 5,
          measures: 4,
          tempo: 120,
          range: { lowest: 'C4', highest: 'C6' },
        })
      )
    })

    it('calls onGenerate with sight-reading parameters', async () => {
      const user = userEvent.setup()
      render(<ExerciseParameterForm {...defaultProps} />)

      // Sight-reading is selected by default
      // Toggle some sight-reading options
      await user.click(screen.getByLabelText(/include accidentals/i))
      await user.click(screen.getByLabelText(/include dynamics/i))

      // Submit form
      await user.click(
        screen.getByRole('button', { name: /generate new exercise/i })
      )

      expect(mockOnGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          includeAccidentals: true,
          includeDynamics: true,
          includeArticulations: false,
          phraseLength: 4,
          melodicMotion: 'mixed',
        })
      )
    })

    it('calls onGenerate with technical exercise parameters', async () => {
      const user = userEvent.setup()
      render(<ExerciseParameterForm {...defaultProps} />)

      // Select technical exercise type
      await user.click(
        screen.getByRole('radio', { name: /select technical exercise type/i })
      )

      // Change technical type to arpeggio
      await user.selectOptions(
        screen.getByLabelText(/technical type/i),
        'arpeggio'
      )

      // Submit form
      await user.click(
        screen.getByRole('button', { name: /generate new exercise/i })
      )

      expect(mockOnGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          technicalType: 'arpeggio',
          includeDescending: true,
        })
      )
    })
  })

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(<ExerciseParameterForm {...defaultProps} isLoading={true} />)

      const submitButton = screen.getByRole('button', {
        name: /generating exercise, please wait/i,
      })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent('Generating...')
    })

    it('shows normal state when isLoading is false', () => {
      render(<ExerciseParameterForm {...defaultProps} isLoading={false} />)

      const submitButton = screen.getByRole('button', {
        name: /generate new exercise/i,
      })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).not.toBeDisabled()
      expect(submitButton.textContent).toBe('Generate Exercise')
    })
  })

  describe('Validation Integration', () => {
    it('calls onGenerate when form is submitted', async () => {
      const user = userEvent.setup()

      render(<ExerciseParameterForm {...defaultProps} />)

      // Submit form
      await user.click(
        screen.getByRole('button', { name: /generate new exercise/i })
      )

      // onGenerate should be called with form data
      expect(mockOnGenerate).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<ExerciseParameterForm {...defaultProps} />)

      // Form has proper role and label
      expect(
        screen.getByRole('form', {
          name: /exercise parameter configuration form/i,
        })
      ).toBeInTheDocument()

      // Radio group has proper role and label
      expect(
        screen.getByRole('radiogroup', { name: /exercise type selection/i })
      ).toBeInTheDocument()

      // Submit button has descriptive label
      expect(
        screen.getByRole('button', { name: /generate new exercise/i })
      ).toBeInTheDocument()
    })

    it('associates labels with form controls', () => {
      render(<ExerciseParameterForm {...defaultProps} />)

      // Check that labels are properly associated
      expect(screen.getByLabelText(/key signature/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/time signature/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/clef/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/lowest note/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/highest note/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/difficulty/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/measures/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tempo/i)).toBeInTheDocument()
    })

    it('provides proper focus management', async () => {
      const user = userEvent.setup()
      render(<ExerciseParameterForm {...defaultProps} />)

      // Test keyboard navigation
      await user.tab()
      expect(
        screen.getByRole('radio', {
          name: /select sight reading exercise type/i,
        })
      ).toHaveFocus()

      await user.tab()
      expect(
        screen.getByRole('radio', { name: /select technical exercise type/i })
      ).toHaveFocus()
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes correctly', () => {
      render(<ExerciseParameterForm {...defaultProps} />)

      // Check for responsive grid classes
      const form = screen.getByRole('form')
      expect(form).toHaveClass('p-4', 'sm:p-6')

      // Check exercise type buttons container
      const exerciseTypeContainer = screen.getByRole('radiogroup')
      expect(exerciseTypeContainer).toHaveClass(
        'grid-cols-1',
        'sm:grid-cols-2',
        'md:grid-cols-4'
      )
    })
  })
})
