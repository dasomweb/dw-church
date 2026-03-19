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
    // DateBadge uses new Date() which may shift the date depending on timezone
    expect(screen.getByText(/2024\.\d+\.\d+/)).toBeInTheDocument();
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

  it('renders thumbnail image', () => {
    render(<BulletinCard bulletin={mockBulletin} />);
    const img = screen.getByAltText('Weekly Bulletin - January 7');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/img1.jpg');
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
