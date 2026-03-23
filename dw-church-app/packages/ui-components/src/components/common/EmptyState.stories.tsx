import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Common/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithDescription: Story = {
  args: {
    title: '검색 결과가 없습니다',
    description: '다른 검색어를 입력해 주세요.',
  },
};

export const Custom: Story = {
  args: {
    title: '등록된 설교가 없습니다',
    description: '새로운 설교를 등록해 주세요.',
    className: 'max-w-md',
  },
};
