import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Typography,
  MusicTitle,
  MusicComposer,
  MusicMetadata,
  MusicTitleLarge,
  MusicComposerLarge,
} from './Typography'

describe('Typography', () => {
  describe('header variants', () => {
    it('should render h1 variant', () => {
      render(<Typography variant="h1">Heading 1</Typography>)
      const element = screen.getByText('Heading 1')
      expect(element.tagName).toBe('H1')
      expect(element).toHaveClass('font-lexend')
    })

    it('should render h2 variant', () => {
      render(<Typography variant="h2">Heading 2</Typography>)
      expect(screen.getByText('Heading 2').tagName).toBe('H2')
    })

    it('should render h3-h6 variants', () => {
      const { rerender } = render(<Typography variant="h3">H3</Typography>)
      expect(screen.getByText('H3').tagName).toBe('H3')

      rerender(<Typography variant="h4">H4</Typography>)
      expect(screen.getByText('H4').tagName).toBe('H4')

      rerender(<Typography variant="h5">H5</Typography>)
      expect(screen.getByText('H5').tagName).toBe('H5')

      rerender(<Typography variant="h6">H6</Typography>)
      expect(screen.getByText('H6').tagName).toBe('H6')
    })
  })

  describe('body variants', () => {
    it('should render body-lg variant', () => {
      render(<Typography variant="body-lg">Large body</Typography>)
      const element = screen.getByText('Large body')
      expect(element.tagName).toBe('P')
      expect(element).toHaveClass('font-inter', 'text-lg')
    })

    it('should render body variant', () => {
      render(<Typography variant="body">Body text</Typography>)
      expect(screen.getByText('Body text').tagName).toBe('P')
    })

    it('should render body-sm variant', () => {
      render(<Typography variant="body-sm">Small body</Typography>)
      expect(screen.getByText('Small body')).toHaveClass('text-sm')
    })

    it('should render caption variant', () => {
      render(<Typography variant="caption">Caption</Typography>)
      const element = screen.getByText('Caption')
      expect(element.tagName).toBe('SPAN')
      expect(element).toHaveClass('text-xs')
    })
  })

  describe('music variants', () => {
    it('should render music-title variant with serif font', () => {
      render(<Typography variant="music-title">Sonata</Typography>)
      expect(screen.getByText('Sonata')).toHaveClass('font-serif')
    })

    it('should render music-title-large variant', () => {
      render(<Typography variant="music-title-large">Symphony</Typography>)
      const element = screen.getByText('Symphony')
      expect(element.tagName).toBe('H1')
      expect(element).toHaveClass('font-serif')
    })

    it('should render music-composer variant', () => {
      render(<Typography variant="music-composer">Mozart</Typography>)
      expect(screen.getByText('Mozart')).toHaveClass('font-serif')
    })

    it('should render music-metadata variant', () => {
      render(<Typography variant="music-metadata">Opus 1</Typography>)
      expect(screen.getByText('Opus 1')).toHaveClass('font-inter')
    })
  })

  describe('as prop', () => {
    it('should render as custom element', () => {
      render(
        <Typography variant="body" as="span">
          As span
        </Typography>
      )
      expect(screen.getByText('As span').tagName).toBe('SPAN')
    })

    it('should render as label with htmlFor', () => {
      render(
        <Typography variant="body" as="label" htmlFor="input-id">
          Label
        </Typography>
      )
      const label = screen.getByText('Label')
      expect(label.tagName).toBe('LABEL')
      expect(label).toHaveAttribute('for', 'input-id')
    })
  })

  describe('fontFamily override', () => {
    it('should override font family to inter', () => {
      render(
        <Typography variant="music-title" fontFamily="inter">
          Override
        </Typography>
      )
      expect(screen.getByText('Override')).toHaveClass('font-inter')
    })

    it('should override font family to lexend', () => {
      render(
        <Typography variant="body" fontFamily="lexend">
          Lexend
        </Typography>
      )
      expect(screen.getByText('Lexend')).toHaveClass('font-lexend')
    })
  })

  describe('interactions', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()

      render(
        <Typography variant="body" onClick={onClick}>
          Clickable
        </Typography>
      )

      await user.click(screen.getByText('Clickable'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  it('should apply custom className', () => {
    render(
      <Typography variant="body" className="custom-class">
        Custom
      </Typography>
    )
    expect(screen.getByText('Custom')).toHaveClass('custom-class')
  })
})

describe('Convenience components', () => {
  it('MusicTitle should render music-title variant', () => {
    render(<MusicTitle>Title</MusicTitle>)
    expect(screen.getByText('Title')).toHaveClass('font-serif')
  })

  it('MusicComposer should render music-composer variant', () => {
    render(<MusicComposer>Composer</MusicComposer>)
    expect(screen.getByText('Composer')).toHaveClass('font-serif')
  })

  it('MusicMetadata should render music-metadata variant', () => {
    render(<MusicMetadata>Metadata</MusicMetadata>)
    expect(screen.getByText('Metadata')).toHaveClass('font-inter')
  })

  it('MusicTitleLarge should render music-title-large variant', () => {
    render(<MusicTitleLarge>Large Title</MusicTitleLarge>)
    expect(screen.getByText('Large Title').tagName).toBe('H1')
  })

  it('MusicComposerLarge should render music-composer-large variant', () => {
    render(<MusicComposerLarge>Large Composer</MusicComposerLarge>)
    expect(screen.getByText('Large Composer')).toHaveClass('font-serif')
  })
})
