import type { Meta, StoryObj } from '@storybook/react';
import type { History } from '@dw-church/api-client';
import { HistoryTimeline } from './HistoryTimeline';

const mockHistory: History[] = [
  {
    id: 1,
    year: 2024,
    items: [
      { id: '1-1', month: 3, day: 10, content: '교회 창립 50주년 기념 예배', photoUrl: '' },
      { id: '1-2', month: 6, day: 15, content: '새 성전 건축 기공식', photoUrl: '' },
      { id: '1-3', month: 11, day: 1, content: '해외 선교팀 파송', photoUrl: '' },
    ],
  },
  {
    id: 2,
    year: 2023,
    items: [
      { id: '2-1', month: 1, day: 1, content: '신년 특별 새벽기도회', photoUrl: '' },
      { id: '2-2', month: 5, day: 20, content: '교회학교 여름캠프', photoUrl: '' },
      { id: '2-3', month: 9, day: 3, content: '추수감사절 바자회', photoUrl: '' },
      { id: '2-4', month: 12, day: 25, content: '성탄절 축하 음악회', photoUrl: '' },
    ],
  },
  {
    id: 3,
    year: 2022,
    items: [
      { id: '3-1', month: 4, day: 17, content: '부활절 특별 예배', photoUrl: '' },
      { id: '3-2', month: 8, day: 10, content: '청년부 수련회', photoUrl: '' },
    ],
  },
];

const meta = {
  title: 'History/HistoryTimeline',
  component: HistoryTimeline,
  tags: ['autodocs'],
} satisfies Meta<typeof HistoryTimeline>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
  args: {
    data: mockHistory,
    layout: 'vertical',
  },
};

export const Horizontal: Story = {
  args: {
    data: mockHistory,
    layout: 'horizontal',
  },
};

export const SingleYear: Story = {
  args: {
    data: [mockHistory[0]],
    layout: 'vertical',
  },
};
