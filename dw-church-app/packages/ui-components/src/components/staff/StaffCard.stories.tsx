import type { Meta, StoryObj } from '@storybook/react';
import type { Staff } from '@dw-church/api-client';
import { StaffCard } from './StaffCard';

const mockStaff: Staff = {
  id: 1,
  name: '김철수',
  role: '담임목사',
  department: '목회실',
  email: 'pastor@church.org',
  phone: '010-1234-5678',
  bio: '신학대학교 졸업, 20년 목회 경력',
  order: 1,
  photoUrl: 'https://placehold.co/200x200/1e3a5f/ffffff?text=Pastor',
  snsLinks: {},
  isActive: true,
};

const meta = {
  title: 'Staff/StaffCard',
  component: StaffCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StaffCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    staff: mockStaff,
  },
};

export const WithSns: Story = {
  args: {
    staff: {
      ...mockStaff,
      id: 2,
      name: '박영희',
      role: '교육전도사',
      department: '교육부',
      snsLinks: {
        facebook: 'https://facebook.com/example',
        instagram: 'https://instagram.com/example',
        youtube: 'https://youtube.com/@example',
      },
    },
  },
};

export const Inactive: Story = {
  args: {
    staff: {
      ...mockStaff,
      id: 3,
      name: '이민수',
      role: '부목사',
      department: '선교부',
      photoUrl: '',
      isActive: false,
    },
  },
};
