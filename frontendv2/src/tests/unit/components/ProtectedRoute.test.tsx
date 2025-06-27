import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'

describe('ProtectedRoute', () => {
  it('should render children directly', () => {
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should render multiple children', () => {
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
    expect(screen.getByText('Child 3')).toBeInTheDocument()
  })

  it('should render complex components as children', () => {
    const ComplexComponent = () => (
      <div>
        <h1>Title</h1>
        <p>Content</p>
        <button>Action</button>
      </div>
    )

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <ComplexComponent />
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })
})
