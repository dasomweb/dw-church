import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulletinCard } from '../components/bulletin/BulletinCard';
import type { Bulletin } from '@dw-church/api-client';

const mockBulletin: Bulletin = {
  id: 1,
  title: 'Weekly Bulletin - January 7',
  date: '2024-01-07',
  pdfUrl: 'https://example.com/bulletin.pdf',
  images: ['https://example.com/img1.jpg'],
  thumbnailUrl: 'https://example.com/thumb.jpg',
  status: 'publish',
  createdAt: '2024-01-07T00:00:00Z',
  modifiedAt: '2024-01-07T00:00:00Z',
};

const mockBulletinNoPdf: Bulletin = {
  ...mockBulletin,
  id: 2,
  title: 'Bulletin Without PDF',
  pdfUrl: '',
};

describe('BulletinCard', () => {
  it('renders title and date', () => {
    render(<BulletinCard bulletin={mockBulletin} />);
    expect(screen.getByText('Weekly Bulletin - January 7')).toBeInTheDocument();
    // 컴포넌트가 "YYYY년 M월 D일" 한국식 포맷으로 출력 (BulletinCard.formatDate
    // 참조). 옛 regex 는 "2024.1.7" 같은 dot-separated 포맷에 맞춰져 있었음.
    // TZ 영향으로 day 는 6~7 변동 가능.
    expect(screen.getByText(/2024년 \d+월 \d+일/)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<BulletinCard bulletin={mockBulletin} onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith(1);
  });

  it('shows PDF download button when pdfUrl exists', () => {
    render(<BulletinCard bulletin={mockBulletin} />);
    const pdfLink = screen.getByLabelText('Weekly Bulletin - January 7 PDF 다운로드');
    expect(pdfLink).toBeInTheDocument();
    expect(pdfLink).toHaveAttribute('href', 'https://example.com/bulletin.pdf');
    expect(pdfLink).toHaveAttribute('target', '_blank');
  });

  it('does not show PDF button when pdfUrl is empty', () => {
    render(<BulletinCard bulletin={mockBulletinNoPdf} />);
    expect(screen.queryByText('PDF')).not.toBeInTheDocument();
  });

  it('does not render thumbnail image (card is text-only)', () => {
    // BulletinCard 의 현재 디자인: 좌측 날짜+제목, 우측 PDF 다운로드 버튼.
    // 썸네일 이미지는 SingleBulletin (상세 페이지) 에서만 사용. 카드는
    // 리스트 row 형태로 텍스트 중심. 이 테스트는 컴포넌트가 img 를
    // 렌더하지 않음을 명시적으로 보장.
    render(<BulletinCard bulletin={mockBulletin} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('has button role when onClick is provided', () => {
    const handleClick = vi.fn();
    render(<BulletinCard bulletin={mockBulletin} onClick={handleClick} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not have button role when onClick is not provided', () => {
    render(<BulletinCard bulletin={mockBulletin} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
