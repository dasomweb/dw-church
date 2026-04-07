import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import type { Board, BoardPost, ListParams, PostStatus } from '@dw-church/api-client';
import {
  useBoards,
  useCreateBoard,
  useUpdateBoard,
  useDeleteBoard,
  useBoardPosts,
  useCreateBoardPost,
  useUpdateBoardPost,
  useDeleteBoardPost,
  useUploadFile,
} from '@dw-church/api-client';
import { FormField, FormSection, FormRow, inputClass, selectClass, textareaClass, useToast, ConfirmDialog, EmptyState, TableSkeleton } from '../components';

// ─── Board Form ────────────────────────────────────────────
interface BoardFormData {
  title: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

// ─── Post Form ─────────────────────────────────────────────
interface PostFormData {
  title: string;
  authorName: string;
  content: string;
  isPinned: boolean;
  status: PostStatus;
}

interface Attachment {
  url: string;
  filename: string;
  size?: number;
  type?: string;
}

export default function BoardManagement() {
  const [tab, setTab] = useState<'boards' | 'posts'>('boards');
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [boardView, setBoardView] = useState<'list' | 'edit'>('list');
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [postView, setPostView] = useState<'list' | 'edit'>('list');
  const [editingPost, setEditingPost] = useState<BoardPost | null>(null);
  const [postParams, setPostParams] = useState<ListParams>({ page: 1, perPage: 10 });
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'board' | 'post'; id: string; boardId?: string; name: string } | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const { showToast } = useToast();
  const { data: boards, isLoading: boardsLoading } = useBoards();
  const { data: postsData, isLoading: postsLoading } = useBoardPosts(
    selectedBoard?.id ?? '',
    postParams,
  );

  const createBoardMutation = useCreateBoard();
  const updateBoardMutation = useUpdateBoard();
  const deleteBoardMutation = useDeleteBoard();
  const createPostMutation = useCreateBoardPost();
  const updatePostMutation = useUpdateBoardPost();
  const deletePostMutation = useDeleteBoardPost();
  const uploadMutation = useUploadFile();

  const boardForm = useForm<BoardFormData>();
  const postForm = useForm<PostFormData>();

  // ─── Board CRUD ──────────────────────────────────────
  const handleCreateBoard = () => {
    setEditingBoard(null);
    boardForm.reset({ title: '', slug: '', description: '', sortOrder: 0, isActive: true });
    setBoardView('edit');
  };

  const handleEditBoard = (board: Board) => {
    setEditingBoard(board);
    boardForm.reset({
      title: board.title,
      slug: board.slug,
      description: board.description,
      sortOrder: board.sortOrder,
      isActive: board.isActive,
    });
    setBoardView('edit');
  };

  const onBoardSubmit = (formData: BoardFormData) => {
    if (editingBoard) {
      updateBoardMutation.mutate(
        { id: editingBoard.id, data: formData },
        {
          onSuccess: () => { showToast('success', '저장되었습니다.'); setBoardView('list'); },
          onError: () => { showToast('error', '오류가 발생했습니다.'); },
        },
      );
    } else {
      createBoardMutation.mutate(formData as any, {
        onSuccess: () => { showToast('success', '게시판이 생성되었습니다.'); setBoardView('list'); },
        onError: () => { showToast('error', '오류가 발생했습니다.'); },
      });
    }
  };

  const handleSelectBoard = (board: Board) => {
    setSelectedBoard(board);
    setTab('posts');
    setPostView('list');
    setPostParams({ page: 1, perPage: 10 });
  };

  // ─── Post CRUD ───────────────────────────────────────
  const handleCreatePost = () => {
    setEditingPost(null);
    postForm.reset({ title: '', authorName: '', content: '', isPinned: false, status: 'published' });
    setAttachments([]);
    setPostView('edit');
  };

  const handleEditPost = (post: BoardPost) => {
    setEditingPost(post);
    postForm.reset({
      title: post.title,
      authorName: post.authorName,
      content: post.content,
      isPinned: post.isPinned,
      status: post.status,
    });
    setAttachments(post.attachments ?? []);
    setPostView('edit');
  };

  const onPostSubmit = (formData: PostFormData) => {
    if (!selectedBoard) return;

    const payload = { ...formData, attachments };

    if (editingPost) {
      updatePostMutation.mutate(
        { boardId: selectedBoard.id, postId: editingPost.id, data: payload },
        {
          onSuccess: () => { showToast('success', '저장되었습니다.'); setPostView('list'); },
          onError: () => { showToast('error', '오류가 발생했습니다.'); },
        },
      );
    } else {
      createPostMutation.mutate(
        { boardId: selectedBoard.id, data: payload as any },
        {
          onSuccess: () => { showToast('success', '게시글이 등록되었습니다.'); setPostView('list'); },
          onError: () => { showToast('error', '오류가 발생했습니다.'); },
        },
      );
    }
  };

  // ─── File Upload ─────────────────────────────────────
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      try {
        const result = await uploadMutation.mutateAsync(file);
        setAttachments((prev) => [
          ...prev,
          { url: result.url, filename: file.name, size: file.size, type: file.type },
        ]);
      } catch {
        showToast('error', `파일 업로드 실패: ${file.name}`);
      }
    }
  }, [uploadMutation, showToast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Delete Confirm ──────────────────────────────────
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'board') {
      deleteBoardMutation.mutate(deleteTarget.id, {
        onSuccess: () => {
          showToast('success', '삭제되었습니다.');
          if (selectedBoard?.id === deleteTarget.id) {
            setSelectedBoard(null);
            setTab('boards');
          }
        },
        onError: () => showToast('error', '삭제 실패'),
      });
    } else {
      deletePostMutation.mutate(
        { boardId: deleteTarget.boardId!, postId: deleteTarget.id },
        {
          onSuccess: () => showToast('success', '삭제되었습니다.'),
          onError: () => showToast('error', '삭제 실패'),
        },
      );
    }
    setDeleteTarget(null);
  };

  const boardList = (Array.isArray(boards) ? boards : (boards as any)?.data ?? []) as Board[];
  const posts = postsData?.data ?? [];
  const totalPosts = (postsData as any)?.meta?.total ?? postsData?.total ?? 0;

  const isSavingBoard = createBoardMutation.isPending || updateBoardMutation.isPending;
  const isSavingPost = createPostMutation.isPending || updatePostMutation.isPending;

  // ─── Board Edit Form ─────────────────────────────────
  if (boardView === 'edit') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setBoardView('list')} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h2 className="text-xl font-semibold">{editingBoard ? '게시판 수정' : '게시판 추가'}</h2>
        </div>
        <form onSubmit={boardForm.handleSubmit(onBoardSubmit)} className="space-y-6 bg-white rounded-xl shadow-sm border p-6">
          <FormSection title="게시판 정보">
            <FormField label="게시판 이름" required>
              <input {...boardForm.register('title', { required: true })} className={inputClass} placeholder="예: 한국학교 공지사항" />
            </FormField>
            <FormField label="슬러그 (URL)" required>
              <input {...boardForm.register('slug', { required: true })} className={inputClass} placeholder="예: korean-school-notice" />
            </FormField>
            <FormField label="설명">
              <textarea {...boardForm.register('description')} className={textareaClass} rows={2} />
            </FormField>
            <FormRow>
              <FormField label="정렬 순서">
                <input type="number" {...boardForm.register('sortOrder', { valueAsNumber: true })} className={inputClass} />
              </FormField>
              <FormField label="활성화">
                <select {...boardForm.register('isActive')} className={selectClass}>
                  <option value="true">활성</option>
                  <option value="">비활성</option>
                </select>
              </FormField>
            </FormRow>
          </FormSection>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setBoardView('list')} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">취소</button>
            <button type="submit" disabled={isSavingBoard} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSavingBoard ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─── Post Edit Form ──────────────────────────────────
  if (tab === 'posts' && postView === 'edit') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setPostView('list')} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h2 className="text-xl font-semibold">{editingPost ? '게시글 수정' : '게시글 작성'}</h2>
        </div>
        <form onSubmit={postForm.handleSubmit(onPostSubmit)} className="space-y-6 bg-white rounded-xl shadow-sm border p-6">
          <FormSection title="게시글 정보">
            <FormField label="제목" required>
              <input {...postForm.register('title', { required: true })} className={inputClass} />
            </FormField>
            <FormRow>
              <FormField label="작성자">
                <input {...postForm.register('authorName')} className={inputClass} />
              </FormField>
              <FormField label="상태">
                <select {...postForm.register('status')} className={selectClass}>
                  <option value="published">게시</option>
                  <option value="draft">임시저장</option>
                </select>
              </FormField>
            </FormRow>
            <FormField label="고정">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...postForm.register('isPinned')} className="rounded" />
                <span className="text-sm">상단 고정</span>
              </label>
            </FormField>
          </FormSection>

          <FormSection title="내용">
            <textarea {...postForm.register('content')} className={textareaClass} rows={12} placeholder="HTML 또는 텍스트를 입력하세요" />
          </FormSection>

          <FormSection title="첨부파일">
            {/* Drag & Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="space-y-2">
                <svg className="mx-auto w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 16V4m0 0L8 8m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
                </svg>
                <p className="text-sm text-gray-600">파일을 여기에 끌어다 놓거나</p>
                <label className="inline-block px-4 py-2 text-sm bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                  파일 선택
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  />
                </label>
              </div>
            </div>

            {/* Attachment List */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    {att.type?.startsWith('image/') ? (
                      <img src={att.url} alt={att.filename} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                        {att.filename.split('.').pop()?.toUpperCase() || 'FILE'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.filename}</p>
                      {att.size && <p className="text-xs text-gray-500">{(att.size / 1024).toFixed(1)} KB</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(i)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setPostView('list')} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">취소</button>
            <button type="submit" disabled={isSavingPost} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSavingPost ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─── Main View ───────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => { setTab('boards'); setPostView('list'); }}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'boards' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          게시판 목록
        </button>
        {selectedBoard && (
          <button
            onClick={() => { setTab('posts'); setPostView('list'); }}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'posts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {selectedBoard.title} - 게시글
          </button>
        )}
      </div>

      {/* Tab: Boards */}
      {tab === 'boards' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">게시판 관리</h2>
            <button onClick={handleCreateBoard} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              게시판 추가
            </button>
          </div>

          {boardsLoading ? (
            <TableSkeleton rows={4} />
          ) : boardList.length === 0 ? (
            <EmptyState
              title="게시판이 없습니다"
              description="새 게시판을 추가하여 시작하세요."
              action={{ label: '게시판 추가', onClick: handleCreateBoard }}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">제목</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">슬러그</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">게시글</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">상태</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {boardList.map((board) => (
                    <tr key={board.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button onClick={() => handleSelectBoard(board)} className="text-blue-600 hover:underline font-medium">
                          {board.title}
                        </button>
                        {board.description && <p className="text-xs text-gray-500 mt-0.5">{board.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{board.slug}</td>
                      <td className="px-4 py-3 text-center">{board.postCount ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${board.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {board.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleEditBoard(board)} className="text-gray-500 hover:text-blue-600">수정</button>
                          <button onClick={() => setDeleteTarget({ type: 'board', id: board.id, name: board.title })} className="text-gray-500 hover:text-red-600">삭제</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Posts */}
      {tab === 'posts' && selectedBoard && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{selectedBoard.title} - 게시글</h2>
            <button onClick={handleCreatePost} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              게시글 작성
            </button>
          </div>

          {postsLoading ? (
            <TableSkeleton rows={5} />
          ) : posts.length === 0 ? (
            <EmptyState
              title="게시글이 없습니다"
              description="새 게시글을 작성하세요."
              action={{ label: '게시글 작성', onClick: handleCreatePost }}
            />
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 w-8"></th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">제목</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">작성자</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">조회</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">첨부</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">날짜</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {posts.map((post: BoardPost) => (
                      <tr key={post.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {post.isPinned && (
                            <span className="inline-block w-5 h-5 text-center text-red-500" title="고정">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2h2l-1 7H4L3 7h2V5zm2 0v2h6V5H7z" /></svg>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{post.title}</span>
                          {post.status === 'draft' && <span className="ml-2 text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">임시</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{post.authorName || '-'}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{post.viewCount ?? 0}</td>
                        <td className="px-4 py-3 text-center text-gray-500">
                          {(post.attachments?.length ?? 0) > 0 && (
                            <svg className="w-4 h-4 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {post.createdAt ? new Date(post.createdAt).toLocaleDateString('ko-KR') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleEditPost(post)} className="text-gray-500 hover:text-blue-600">수정</button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'post', id: post.id, boardId: selectedBoard.id, name: post.title })}
                              className="text-gray-500 hover:text-red-600"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPosts > (postParams.perPage ?? 10) && (
                <div className="flex justify-center gap-2 mt-4">
                  {Array.from({ length: Math.ceil(totalPosts / (postParams.perPage ?? 10)) }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPostParams((p) => ({ ...p, page: i + 1 }))}
                      className={`px-3 py-1 text-sm rounded ${postParams.page === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`${deleteTarget?.type === 'board' ? '게시판' : '게시글'} 삭제`}
        message={`"${deleteTarget?.name}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
