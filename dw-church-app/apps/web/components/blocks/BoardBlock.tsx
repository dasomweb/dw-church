import { getBoardBySlug, getBoardPosts } from '@/lib/api';

interface BoardBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function BoardBlock({ props, slug }: BoardBlockProps) {
  const boardSlug = (props.boardSlug as string) || '';
  const limit = (props.limit as number) ?? 10;
  const title = (props.title as string) || '';
  const variant = (props.variant as string) || 'list';

  if (!boardSlug) {
    return (
      <section className="px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl text-center text-gray-400 text-sm">
          게시판 슬러그를 설정해주세요.
        </div>
      </section>
    );
  }

  let board: any = null;
  let posts: any[] = [];

  try {
    board = await getBoardBySlug(slug, boardSlug);
    if (board?.id) {
      const result = await getBoardPosts(slug, board.id, { perPage: limit });
      posts = Array.isArray(result) ? result : (result?.data ?? []);
    }
  } catch {
    posts = [];
  }

  if (!board) return null;

  const displayTitle = title || board.title || '게시판';

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">{displayTitle}</h2>

        {posts.length === 0 ? (
          <p className="text-center text-gray-400">등록된 게시글이 없습니다.</p>
        ) : variant === 'list' ? (
          <BoardListView posts={posts} />
        ) : (
          <BoardGridView posts={posts} columns={variant === 'grid-3' ? 3 : 2} />
        )}
      </div>
    </section>
  );
}

function BoardListView({ posts }: { posts: any[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">제목</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">작성자</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600 hidden sm:table-cell">조회</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">날짜</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {posts.map((post: any) => (
            <tr key={post.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <span className="font-medium">
                  {post.isPinned && <span className="text-red-500 mr-1">[공지]</span>}
                  {post.title}
                </span>
                {(post.attachments?.length ?? 0) > 0 && (
                  <svg className="inline-block w-3.5 h-3.5 ml-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{post.authorName || '-'}</td>
              <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{post.viewCount ?? 0}</td>
              <td className="px-4 py-3 text-right text-gray-500 text-xs">
                {post.createdAt ? new Date(post.createdAt).toLocaleDateString('ko-KR') : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BoardGridView({ posts, columns }: { posts: any[]; columns: number }) {
  const gridClass = columns === 3
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    : 'grid-cols-1 md:grid-cols-2';

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {posts.map((post: any) => (
        <div key={post.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold line-clamp-2">
              {post.isPinned && <span className="text-red-500 mr-1">[공지]</span>}
              {post.title}
            </h3>
          </div>
          {post.content && (
            <p className="text-sm text-gray-600 line-clamp-3 mb-3">
              {post.content.replace(/<[^>]*>/g, '').substring(0, 120)}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{post.authorName || '-'}</span>
            <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString('ko-KR') : '-'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
