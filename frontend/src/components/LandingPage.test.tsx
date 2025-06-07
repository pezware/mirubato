import { render, screen } from '../tests/utils/test-utils'
import LandingPage from './LandingPage'

describe('LandingPage', () => {
  it('renders the main heading', () => {
    render(<LandingPage />)

    const heading = screen.getByText(/mirubato/i)
    expect(heading).toBeInTheDocument()
  })

  it('renders the tagline', () => {
    render(<LandingPage />)

    const tagline = screen.getByText(/play with me/i)
    expect(tagline).toBeInTheDocument()
  })

  it('renders the start practice link', () => {
    render(<LandingPage />)

    const link = screen.getByRole('link', { name: /Start Practice/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/practice')
  })

  it('renders the piano instructions', () => {
    render(<LandingPage />)

    const instructions = screen.getByText(/Play the notes shown below/i)
    expect(instructions).toBeInTheDocument()
  })

  it('renders the audio enable warning', () => {
    render(<LandingPage />)

    const warning = screen.getByText(/First click enables audio/i)
    expect(warning).toBeInTheDocument()
  })
})
