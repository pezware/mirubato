import { describe, it, expect } from '@jest/globals'
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
    
    const tagline = screen.getByText(/open-source sight-reading practice/i)
    expect(tagline).toBeInTheDocument()
  })

  it('renders the start practice button', () => {
    render(<LandingPage />)
    
    const button = screen.getByRole('link', { name: /start practice/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('href', '/practice')
  })

  it('renders the piano chord component', () => {
    render(<LandingPage />)
    
    const pianoSection = screen.getByText(/interactive piano/i)
    expect(pianoSection).toBeInTheDocument()
  })
})