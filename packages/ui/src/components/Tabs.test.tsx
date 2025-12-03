import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, Tab } from './Tabs'

const mockTabs: Tab[] = [
  { id: 'tab1', label: 'Tab One' },
  { id: 'tab2', label: 'Tab Two' },
  { id: 'tab3', label: 'Tab Three' },
]

describe('Tabs', () => {
  const defaultProps = {
    tabs: mockTabs,
    activeTab: 'tab1',
    onTabChange: vi.fn(),
    ariaLabel: 'Main navigation',
  }

  it('should render all tabs', () => {
    render(<Tabs {...defaultProps} />)

    expect(screen.getByText('Tab One')).toBeInTheDocument()
    expect(screen.getByText('Tab Two')).toBeInTheDocument()
    expect(screen.getByText('Tab Three')).toBeInTheDocument()
  })

  it('should highlight active tab', () => {
    render(<Tabs {...defaultProps} activeTab="tab1" />)

    const activeTab = screen.getByTestId('tab1-tab')
    expect(activeTab).toHaveClass('border-morandi-purple-400')
  })

  it('should not highlight inactive tabs', () => {
    render(<Tabs {...defaultProps} activeTab="tab1" />)

    const inactiveTab = screen.getByTestId('tab2-tab')
    expect(inactiveTab).toHaveClass('border-transparent')
  })

  it('should call onTabChange when tab is clicked', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()

    render(<Tabs {...defaultProps} onTabChange={onTabChange} />)

    await user.click(screen.getByTestId('tab2-tab'))
    expect(onTabChange).toHaveBeenCalledWith('tab2')
  })

  describe('with icons', () => {
    it('should render tab with icon', () => {
      const tabsWithIcon: Tab[] = [
        {
          id: 'tab1',
          label: 'Home',
          icon: <span data-testid="home-icon">🏠</span>,
        },
      ]

      render(
        <Tabs
          tabs={tabsWithIcon}
          activeTab="tab1"
          onTabChange={vi.fn()}
          ariaLabel="Tab navigation"
        />
      )

      expect(screen.getByTestId('home-icon')).toBeInTheDocument()
    })
  })

  describe('with shortLabel', () => {
    it('should render shortLabel for mobile', () => {
      const tabsWithShort: Tab[] = [
        { id: 'tab1', label: 'Settings Page', shortLabel: 'Settings' },
      ]

      render(
        <Tabs
          tabs={tabsWithShort}
          activeTab="tab1"
          onTabChange={vi.fn()}
          ariaLabel="Settings navigation"
        />
      )

      // Both labels should be in the document (shown/hidden via CSS)
      expect(screen.getByText('Settings Page')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  describe('mobileIconOnly', () => {
    it('should render icon only on mobile when mobileIconOnly is true', () => {
      const tabsWithMobileIcon: Tab[] = [
        {
          id: 'tab1',
          label: 'Dashboard',
          icon: <span data-testid="dash-icon">📊</span>,
          mobileIconOnly: true,
        },
      ]

      render(
        <Tabs
          tabs={tabsWithMobileIcon}
          activeTab="tab1"
          onTabChange={vi.fn()}
          ariaLabel="Dashboard navigation"
        />
      )

      // Icon renders twice (once for mobile, once for desktop)
      const icons = screen.getAllByTestId('dash-icon')
      expect(icons.length).toBe(2)
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  it('should have border bottom', () => {
    const { container } = render(<Tabs {...defaultProps} />)
    expect(container.firstChild).toHaveClass('border-b')
  })

  it('should apply custom className', () => {
    const { container } = render(
      <Tabs {...defaultProps} className="custom-tabs" />
    )
    expect(container.firstChild).toHaveClass('custom-tabs')
  })

  it('should have navigation role', () => {
    render(<Tabs {...defaultProps} />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
