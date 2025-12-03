import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Loading, LoadingSkeleton, LoadingOverlay } from './Loading'

describe('Loading', () => {
  describe('spinner variant', () => {
    it('should render spinner by default', () => {
      const { container } = render(<Loading />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('animate-spin')
    })

    it('should render with primary color by default', () => {
      const { container } = render(<Loading />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('text-morandi-sage-600')
    })
  })

  describe('dots variant', () => {
    it('should render three dots', () => {
      const { container } = render(<Loading variant="dots" />)
      const dots = container.querySelectorAll('.rounded-full')
      expect(dots).toHaveLength(3)
    })

    it('should animate dots', () => {
      const { container } = render(<Loading variant="dots" />)
      const dots = container.querySelectorAll('.animate-pulse')
      expect(dots.length).toBeGreaterThan(0)
    })
  })

  describe('pulse variant', () => {
    it('should render pulse circle', () => {
      const { container } = render(<Loading variant="pulse" />)
      const pulse = container.querySelector('.animate-pulse')
      expect(pulse).toBeInTheDocument()
    })
  })

  describe('sizes', () => {
    it('should render small size', () => {
      const { container } = render(<Loading size="sm" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-4', 'w-4')
    })

    it('should render medium size (default)', () => {
      const { container } = render(<Loading />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-8', 'w-8')
    })

    it('should render large size', () => {
      const { container } = render(<Loading size="lg" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-12', 'w-12')
    })

    it('should render xl size', () => {
      const { container } = render(<Loading size="xl" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-16', 'w-16')
    })
  })

  describe('colors', () => {
    it('should render white color', () => {
      const { container } = render(<Loading color="white" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('text-white')
    })

    it('should render gray color', () => {
      const { container } = render(<Loading color="gray" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('text-gray-400')
    })
  })

  describe('text', () => {
    it('should render loading text', () => {
      render(<Loading text="Loading..." />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should not render text when not provided', () => {
      const { container } = render(<Loading />)
      expect(container.querySelector('p')).not.toBeInTheDocument()
    })
  })

  describe('fullScreen', () => {
    it('should render fullscreen overlay', () => {
      const { container } = render(<Loading fullScreen />)
      expect(container.firstChild).toHaveClass('fixed', 'inset-0', 'z-50')
    })

    it('should have backdrop blur', () => {
      const { container } = render(<Loading fullScreen />)
      expect(container.firstChild).toHaveClass('backdrop-blur-sm')
    })
  })

  it('should apply custom className', () => {
    const { container } = render(<Loading className="custom-loading" />)
    expect(container.querySelector('.custom-loading')).toBeInTheDocument()
  })
})

describe('LoadingSkeleton', () => {
  it('should render skeleton element', () => {
    const { container } = render(<LoadingSkeleton />)
    expect(container.firstChild).toHaveClass('bg-gray-200', 'rounded')
  })

  it('should animate by default', () => {
    const { container } = render(<LoadingSkeleton />)
    expect(container.firstChild).toHaveClass('animate-pulse')
  })

  it('should not animate when disabled', () => {
    const { container } = render(<LoadingSkeleton animate={false} />)
    expect(container.firstChild).not.toHaveClass('animate-pulse')
  })

  it('should apply custom className', () => {
    const { container } = render(<LoadingSkeleton className="h-10 w-full" />)
    expect(container.firstChild).toHaveClass('h-10', 'w-full')
  })
})

describe('LoadingOverlay', () => {
  it('should render children', () => {
    render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('should show overlay when loading', () => {
    const { container } = render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    )
    expect(container.querySelector('.absolute.inset-0')).toBeInTheDocument()
  })

  it('should hide overlay when not loading', () => {
    const { container } = render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>
    )
    expect(container.querySelector('.absolute.inset-0')).not.toBeInTheDocument()
  })

  it('should show loading text', () => {
    render(
      <LoadingOverlay isLoading={true} text="Please wait...">
        <div>Content</div>
      </LoadingOverlay>
    )
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })

  it('should have backdrop blur', () => {
    const { container } = render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    )
    expect(container.querySelector('.backdrop-blur-sm')).toBeInTheDocument()
  })
})
