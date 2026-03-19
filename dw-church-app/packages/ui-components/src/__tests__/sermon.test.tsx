import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SermonCard } from '../components/sermon/SermonCard';
import type { Sermon } from '@dw-church/api-client';

const mockSermon: Sermon = {
  id: 10,
  title: 'The Good Shepherd',
  youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
  scripture: 'John 10:11-18',
  preacher: 'Pastor Kim',
  date: '2024-01-07',
  thumbnailUrl: 'https://example.com/sermon-thumb.jpg',
  categoryIds: [1],
  category: 'Sunday',
  status: 'publish',
  createdAt: '2024-01-07T00:00:00Z',
  modifiedAt: '2024-01-07T00:00:00Z',
};

const mockSermonNoThumb: Sermon = {
  ...mockSermon,
  id: 11,
  title: 'Sermon Without Thumbnail',
  thumbnailUrl: '',
};

describe('SermonCard', () => {
  it('renders title', () => {
    render(<SermonCard sermon={mockSermon} />);
    expect(screen.getByText('The Good Shepherd')).toBeInTheDocument();
  });

  it('renders preacher name', () => {
    render(<SermonCard sermon={mockSermon} />);
    expect(screen.getByText('Pastor Kim')).toBeInTheDocument();
  });

  it('renders scripture reference', () => {
    render(<SermonCard sermon={mockSermon} />);
    expect(screen.getByText('John 10:11-18')).toBeInTheDocument();
  });

  it('renders date', () => {
    render(<SermonCard sermon={mockSermon} />);
    expect(screen.getByText(/2024\.\d+\.\d+/)).toBeInTheDocument();
  });

  it('renders thumbnail image when thumbnailUrl is provided', () => {
    render(<SermonCard sermon={mockSermon} />);
    const img = screen.getByAltText('The Good Shepherd');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/sermon-thumb.jpg');
  });

  it('falls back to YouTube thumbnail when thumbnailUrl is empty', () => {
    render(<SermonCard sermon={mockSermonNoThumb} />);
    const img = screen.getByAltText('Sermon Without Thumbnail');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('img.youtube.com/vi/abc123');
  });

  it('has button role for accessibility', () => {
    render(<SermonCard sermon={mockSermon} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not render scripture when empty', () => {
    const sermonNoScripture = { ...mockSermon, scripture: '' };
    render(<SermonCard sermon={sermonNoScripture} />);
    expect(screen.queryByText('John 10:11-18')).not.toBeInTheDocument();
  });
});
