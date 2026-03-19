import type { Meta, StoryObj } from '@storybook/react';
import { DateBadge } from './DateBadge';

const meta = {
  title: 'Common/DateBadge',
  component: DateBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof DateBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Short: Story = {
  args: {
    date: '2025-03-15',
    format: 'short',
  },
};

export const Long: Story = {
  args: {
    date: '2025-03-15',
    format: 'long',
  },
};

export const YearMonth: Story = {
  args: {
    date: '2025-03-15',
    format: 'year-month',
  },
};
