import type { Meta, StoryObj } from '@storybook/react'
import ClockTimePicker from './ClockTimePicker'

const meta = {
  title: 'UI/ClockTimePicker',
  component: ClockTimePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'Time value in HH:MM format',
    },
    onChange: {
      action: 'onChange',
    },
  },
} satisfies Meta<typeof ClockTimePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: '09:30',
  },
}

export const Afternoon: Story = {
  args: {
    value: '14:45',
  },
}

export const Midnight: Story = {
  args: {
    value: '00:00',
  },
}

export const WithCustomClass: Story = {
  args: {
    value: '10:15',
    className: 'w-full max-w-xs',
  },
}

export const Mobile: Story = {
  args: {
    value: '09:30',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
}
