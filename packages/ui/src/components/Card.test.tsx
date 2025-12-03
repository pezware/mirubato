import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card'

describe('Card', () => {
  it('should render children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  describe('variants', () => {
    it('should render default variant', () => {
      const { container } = render(<Card variant="default">Default</Card>)
      expect(container.firstChild).toHaveClass('bg-white', 'border')
    })

    it('should render bordered variant', () => {
      const { container } = render(<Card variant="bordered">Bordered</Card>)
      expect(container.firstChild).toHaveClass('border-2')
    })

    it('should render elevated variant', () => {
      const { container } = render(<Card variant="elevated">Elevated</Card>)
      expect(container.firstChild).toHaveClass('shadow-lg')
    })

    it('should render ghost variant', () => {
      const { container } = render(<Card variant="ghost">Ghost</Card>)
      expect(container.firstChild).toHaveClass('bg-transparent')
    })
  })

  describe('padding', () => {
    it('should render with no padding', () => {
      const { container } = render(<Card padding="none">No padding</Card>)
      expect(container.firstChild).not.toHaveClass('p-4')
    })

    it('should render with small padding', () => {
      const { container } = render(<Card padding="sm">Small</Card>)
      expect(container.firstChild).toHaveClass('p-2')
    })

    it('should render with medium padding (default)', () => {
      const { container } = render(<Card>Medium</Card>)
      expect(container.firstChild).toHaveClass('p-4')
    })

    it('should render with large padding', () => {
      const { container } = render(<Card padding="lg">Large</Card>)
      expect(container.firstChild).toHaveClass('p-6')
    })
  })

  describe('interactions', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()

      render(<Card onClick={onClick}>Clickable</Card>)

      await user.click(screen.getByText('Clickable'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('should have cursor-pointer when clickable', () => {
      const { container } = render(<Card onClick={() => {}}>Click</Card>)
      expect(container.firstChild).toHaveClass('cursor-pointer')
    })

    it('should have cursor-pointer when hoverable', () => {
      const { container } = render(<Card hoverable>Hover</Card>)
      expect(container.firstChild).toHaveClass('cursor-pointer')
    })

    it('should have hover effects when hoverable', () => {
      const { container } = render(<Card hoverable>Hover</Card>)
      expect(container.firstChild).toHaveClass('hover:shadow-md')
    })
  })

  it('should apply custom className', () => {
    const { container } = render(<Card className="custom-card">Custom</Card>)
    expect(container.firstChild).toHaveClass('custom-card')
  })

  it('should have rounded corners', () => {
    const { container } = render(<Card>Rounded</Card>)
    expect(container.firstChild).toHaveClass('rounded-lg')
  })
})

describe('CardHeader', () => {
  it('should render children', () => {
    render(<CardHeader>Header content</CardHeader>)
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })

  it('should have margin bottom', () => {
    const { container } = render(<CardHeader>Header</CardHeader>)
    expect(container.firstChild).toHaveClass('mb-4')
  })

  it('should apply custom className', () => {
    const { container } = render(
      <CardHeader className="custom-header">Header</CardHeader>
    )
    expect(container.firstChild).toHaveClass('custom-header')
  })
})

describe('CardTitle', () => {
  it('should render as h3 by default', () => {
    render(<CardTitle>Title</CardTitle>)
    expect(screen.getByText('Title').tagName).toBe('H3')
  })

  it('should render as custom element', () => {
    render(<CardTitle as="h1">H1 Title</CardTitle>)
    expect(screen.getByText('H1 Title').tagName).toBe('H1')
  })

  it('should have title styling', () => {
    render(<CardTitle>Styled</CardTitle>)
    expect(screen.getByText('Styled')).toHaveClass('text-lg', 'font-semibold')
  })

  it('should apply custom className', () => {
    render(<CardTitle className="custom-title">Title</CardTitle>)
    expect(screen.getByText('Title')).toHaveClass('custom-title')
  })
})

describe('CardDescription', () => {
  it('should render as paragraph', () => {
    render(<CardDescription>Description</CardDescription>)
    expect(screen.getByText('Description').tagName).toBe('P')
  })

  it('should have description styling', () => {
    render(<CardDescription>Styled</CardDescription>)
    expect(screen.getByText('Styled')).toHaveClass('text-sm', 'text-gray-600')
  })

  it('should apply custom className', () => {
    render(<CardDescription className="custom-desc">Desc</CardDescription>)
    expect(screen.getByText('Desc')).toHaveClass('custom-desc')
  })
})

describe('CardContent', () => {
  it('should render children', () => {
    render(<CardContent>Content</CardContent>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <CardContent className="custom-content">Content</CardContent>
    )
    expect(container.firstChild).toHaveClass('custom-content')
  })
})

describe('CardFooter', () => {
  it('should render children', () => {
    render(<CardFooter>Footer</CardFooter>)
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('should have flex layout', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>)
    expect(container.firstChild).toHaveClass('flex', 'items-center')
  })

  it('should have margin top', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>)
    expect(container.firstChild).toHaveClass('mt-4')
  })

  it('should apply custom className', () => {
    const { container } = render(
      <CardFooter className="custom-footer">Footer</CardFooter>
    )
    expect(container.firstChild).toHaveClass('custom-footer')
  })
})

describe('Card composition', () => {
  it('should compose all card parts together', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Full Card</CardTitle>
          <CardDescription>A complete card example</CardDescription>
        </CardHeader>
        <CardContent>Main content here</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>
    )

    expect(screen.getByText('Full Card')).toBeInTheDocument()
    expect(screen.getByText('A complete card example')).toBeInTheDocument()
    expect(screen.getByText('Main content here')).toBeInTheDocument()
    expect(screen.getByText('Footer actions')).toBeInTheDocument()
  })
})
