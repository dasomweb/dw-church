import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SermonCard } from '../components/sermon/SermonCard';
import type { Sermon } from '@dw-church/api-client';

const mockSermon: Sermon = {
  id: '10',
  title: 'The Good Shepherd',
  youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
  scripture: 'John 10:11-18',
  preacher: 'Pastor Kim',
  date: '2024-01-07',
  thumbnailUrl: 'https://example.com/sermon-thumb.jpg',
  categoryIds: ['1'],
  category: 'Sunday',
  status: 'published',
  createdAt: '2024-01-07T00:00:00Z',
  modifiedAt: '2024-01-07T00:00:00Z',
};

const mockSermonNoThumb: Sermon = {
  ...mockSermon,
  id: '11',
  title: 'Sermon Without Thumbnail',
  thumbnailUrl: '',
};

// SermonCard.getThumbnailUrl() 의 우선순위: YouTube videoId > thumbnailUrl.
// 운영 결정: 운영자 업로드 이미지보다 YouTube 의 hqdefault 가 일관된 품질을
// 보장한다 (mockSermon 은 둘 다 있어서 YouTube 결과 반환).
// thumbnailUrl-only 경로 테스트엔 별도 mock 필요.
const mockSermonThumbOnly: Sermon = {
  ...mockSermon,
  id: '12',
  title: 'Sermon With Thumbnail Only',
  youtubeUrl: '',
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

  it('uses YouTube thumbnail when youtubeUrl is set (preferred over thumbnailUrl)', () => {
    // mockSermon 은 youtubeUrl + thumbnailUrl 둘 다 있음. 컴포넌트의
    // 우선순위에 따라 YouTube hqdefault 가 노출되어야 함.
    render(<SermonCard sermon={mockSermon} />);
    const img = screen.getByAltText('The Good Shepherd');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('img.youtube.com/vi/abc123');
  });

  it('uses thumbnailUrl when youtubeUrl is empty', () => {
    render(<SermonCard sermon={mockSermonThumbOnly} />);
    const img = screen.getByAltText('Sermon With Thumbnail Only');
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
