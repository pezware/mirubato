import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Typography,
  MusicTitle,
  MusicComposer,
  MusicMetadata,
} from './Typography'

describe('Typography Component', () => {
  describe('Typography', () => {
    it('renders with correct variant classes', () => {
      render(<Typography variant="music-title">Test Title</Typography>)
      const element = screen.getByText('Test Title')

      expect(element).toHaveClass('font-serif')
      expect(element).toHaveClass('text-lg')
      expect(element).toHaveClass('font-medium')
    })

    it('allows custom className override', () => {
      render(
        <Typography variant="body" className="custom-class">
          Test Body
        </Typography>
      )
      const element = screen.getByText('Test Body')

      expect(element).toHaveClass('font-inter')
      expect(element).toHaveClass('custom-class')
    })

    it('uses correct HTML element by default', () => {
      render(<Typography variant="h1">Header</Typography>)
      const element = screen.getByRole('heading', { level: 1 })

      expect(element.tagName).toBe('H1')
    })

    it('allows custom HTML element override', () => {
      render(
        <Typography variant="h1" as="div">
          Header as div
        </Typography>
      )
      const element = screen.getByText('Header as div')

      expect(element.tagName).toBe('DIV')
    })

    it('allows font family override', () => {
      render(
        <Typography variant="music-title" fontFamily="inter">
          Title with Inter
        </Typography>
      )
      const element = screen.getByText('Title with Inter')

      expect(element).toHaveClass('font-inter')
      expect(element).not.toHaveClass('font-serif')
    })
  })

  describe('Convenience Components', () => {
    it('MusicTitle renders with correct classes', () => {
      render(<MusicTitle>Sonata No. 1</MusicTitle>)
      const element = screen.getByText('Sonata No. 1')

      expect(element).toHaveClass('font-serif')
      expect(element).toHaveClass('text-lg')
      expect(element).toHaveClass('font-medium')
      expect(element.tagName).toBe('H3')
    })

    it('MusicComposer renders with correct classes', () => {
      render(<MusicComposer>Mozart</MusicComposer>)
      const element = screen.getByText('Mozart')

      expect(element).toHaveClass('font-serif')
      expect(element).toHaveClass('text-base')
      expect(element.tagName).toBe('P')
    })

    it('MusicMetadata renders with correct classes', () => {
      render(<MusicMetadata>Opus 1</MusicMetadata>)
      const element = screen.getByText('Opus 1')

      expect(element).toHaveClass('font-inter')
      expect(element).toHaveClass('text-sm')
      expect(element.tagName).toBe('SPAN')
    })
  })

  describe('Font Hierarchy Validation', () => {
    it('ensures music content uses serif font', () => {
      render(<MusicTitle>Piano Sonata</MusicTitle>)
      render(<MusicComposer>Beethoven</MusicComposer>)

      const title = screen.getByText('Piano Sonata')
      const composer = screen.getByText('Beethoven')

      expect(title).toHaveClass('font-serif')
      expect(composer).toHaveClass('font-serif')
    })

    it('ensures UI metadata uses inter font', () => {
      render(<MusicMetadata>Level 5</MusicMetadata>)

      const metadata = screen.getByText('Level 5')
      expect(metadata).toHaveClass('font-inter')
    })

    it('ensures headers use lexend font', () => {
      render(<Typography variant="h2">Section Header</Typography>)

      const header = screen.getByRole('heading', { level: 2 })
      expect(header).toHaveClass('font-lexend')
    })
  })
})
