import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { DateBadge } from '../components/common/DateBadge';
import { YoutubeEmbed } from '../components/common/YoutubeEmbed';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

describe('LoadingSpinner', () => {
  it('renders with correct role', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders sr-only text', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders default title', () => {
    render(<EmptyState />);
    expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(<EmptyState title="No items" description="Try again later" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Try again later')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
  });
});

describe('DateBadge', () => {
  it('formats date in short format', () => {
    render(<DateBadge date="2024-03-15" format="short" />);
    // Timezone may shift date by 1 day
    expect(screen.getByText(/2024\.3\.1[45]/)).toBeInTheDocument();
  });

  it('formats date in long format', () => {
    render(<DateBadge date="2024-03-15" format="long" />);
    expect(screen.getByText(/2024년 3월 1[45]일/)).toBeInTheDocument();
  });

  it('formats date in year-month format', () => {
    render(<DateBadge date="2024-03-15" format="year-month" />);
    expect(screen.getByText('2024년 3월')).toBeInTheDocument();
  });

  it('returns raw string for invalid date', () => {
    render(<DateBadge date="not-a-date" />);
    expect(screen.getByText('not-a-date')).toBeInTheDocument();
  });

  it('defaults to short format', () => {
    render(<DateBadge date="2024-12-25" />);
    expect(screen.getByText(/2024\.12\.2[45]/)).toBeInTheDocument();
  });
});

describe('YoutubeEmbed', () => {
  it('extracts video ID from standard URL and renders iframe', () => {
    render(<YoutubeEmbed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />);
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.src).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('extracts video ID from short URL', () => {
    render(<YoutubeEmbed url="https://youtu.be/dQw4w9WgXcQ" />);
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.src).toContain('dQw4w9WgXcQ');
  });

  it('renders with custom title', () => {
    render(<YoutubeEmbed url="https://youtu.be/abc123" title="My Video" />);
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.title).toBe('My Video');
  });

  it('returns null for invalid URL', () => {
    const { container } = render(<YoutubeEmbed url="not-a-youtube-url" />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null for empty URL', () => {
    const { container } = render(<YoutubeEmbed url="" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('ErrorBoundary', () => {
  // Suppress console.error during error boundary tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = () => {};
  });
  afterEach(() => {
    console.error = originalError;
  });

  function ThrowingComponent(): JSX.Element {
    throw new Error('Test error');
  }

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('catches errors and shows default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('컴포넌트 로딩 중 오류가 발생했습니다.')).toBeInTheDocument();
    expect(screen.getByText('다시 시도')).toBeInTheDocument();
  });

  it('catches errors and shows custom fallback', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error message</div>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });
});
