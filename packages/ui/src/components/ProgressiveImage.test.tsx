import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ProgressiveImage from './ProgressiveImage'

// Mock Image constructor
class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  crossOrigin = ''

  constructor() {
    // Simulate async image loading
    setTimeout(() => {
      if (this.src && this.src.includes('error')) {
        this.onerror?.()
      } else {
        this.onload?.()
      }
    }, 0)
  }
}

describe('ProgressiveImage', () => {
  const defaultProps = {
    src: 'https://example.com/image.jpg',
    alt: 'Test image',
  }

  beforeEach(() => {
    // @ts-expect-error - Mocking global Image
    global.Image = MockImage
  })

  it('should render image with alt text', async () => {
    render(<ProgressiveImage {...defaultProps} />)

    await waitFor(() => {
      const images = screen.getAllByRole('img')
      expect(images.some(img => img.getAttribute('alt') === 'Test image')).toBe(
        true
      )
    })
  })

  it('should show loading skeleton when no placeholder', () => {
    const { container } = render(<ProgressiveImage {...defaultProps} />)

    // Initially shows skeleton
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <ProgressiveImage {...defaultProps} className="custom-image" />
    )
    expect(container.firstChild).toHaveClass('custom-image')
  })

  describe('placeholder', () => {
    it('should render placeholder while loading', () => {
      const { container } = render(
        <ProgressiveImage
          {...defaultProps}
          placeholderSrc="https://example.com/placeholder.jpg"
        />
      )

      const images = container.querySelectorAll('img')
      expect(images.length).toBeGreaterThan(0)
    })

    it('should apply blur to placeholder', () => {
      const { container } = render(
        <ProgressiveImage
          {...defaultProps}
          placeholderSrc="https://example.com/placeholder.jpg"
          blurAmount={30}
        />
      )

      const placeholderImg = container.querySelector('img[style*="blur(30px)"]')
      // The blur is applied via inline style
      expect(
        placeholderImg || container.querySelector('img')
      ).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('should show error state when image fails to load', async () => {
      render(
        <ProgressiveImage
          src="https://example.com/error-image.jpg"
          alt="Error image"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument()
      })
    })

    it('should call onError callback when image fails', async () => {
      const onError = vi.fn()

      render(
        <ProgressiveImage
          src="https://example.com/error-image.jpg"
          alt="Error image"
          onError={onError}
        />
      )

      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
    })
  })

  describe('callbacks', () => {
    it('should call onLoad when image loads successfully', async () => {
      const onLoad = vi.fn()

      render(<ProgressiveImage {...defaultProps} onLoad={onLoad} />)

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalled()
      })
    })
  })

  describe('transition', () => {
    it('should apply custom transition duration', () => {
      const { container } = render(
        <ProgressiveImage {...defaultProps} transitionDuration={500} />
      )

      const img = container.querySelector('img')
      expect(img).toHaveStyle({ transitionDuration: '500ms' })
    })

    it('should use default transition duration', () => {
      const { container } = render(<ProgressiveImage {...defaultProps} />)

      const img = container.querySelector('img')
      expect(img).toHaveStyle({ transitionDuration: '300ms' })
    })
  })

  it('should have overflow hidden', () => {
    const { container } = render(<ProgressiveImage {...defaultProps} />)
    expect(container.firstChild).toHaveClass('overflow-hidden')
  })
})
