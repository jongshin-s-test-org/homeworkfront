'use client';

import { useState, useEffect, FormEvent, JSX } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/app/contexts/AuthContext';

interface FileInfo {
  originalName: string;
  storedName?: string;
  url: string;
  fileSize?: number;
  contentType?: string;
}

interface Post {
  id: number;
  title: string;
  content?: string;
  body?: string;
  email: string;
  createdDate: string;
  modifiedDate?: string;
  views?: number;
  fileInfo?: FileInfo;
}

interface Comment {
  id?: number;
  comment_id?: number;
  commentId?: number;
  description: string;
  email: string;
  createdDate: string;
  depth?: number;
  comment_depth?: number;
  commentDepth?: number;
  comments?: Comment[];
}

interface PostDetailPageProps {
  params: {
    id: string;
  };
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentDescription, setCommentDescription] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  useEffect(() => {
    const cancelTokenSource = axios.CancelToken.source();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get<Post>(`/api/posts/${params.id}`, {
          headers: {
            'Accept': 'application/json'
          },
          cancelToken: cancelTokenSource.token
        });

        setPost(data);
      } catch (e) {
        if (!axios.isCancel(e)) {
          if (axios.isAxiosError(e)) {
            if (e.response?.status === 401) {
              setError('로그인 이후 사용해주세요');
            } else if (e.response?.status === 404) {
              setError('게시물을 찾을 수 없습니다.');
            } else {
              setError(e.message);
            }
          } else if (e instanceof Error) {
            setError(e.message);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      load();
    }

    return () => {
      cancelTokenSource.cancel('Component unmounted');
    };
  }, [params.id]);

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) {
      return;
    }

    setDeleting(true);
    try {
      await axios.delete(`/api/posts/${params.id}`, {
        withCredentials: true
      });
      router.push('/');
      router.refresh();
    } catch (err) {
      let message = '게시물 삭제에 실패했습니다.';
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || err.response?.data || err.message || message;
      }
      alert(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleFileDownload = async (fileInfo: FileInfo) => {
    if (!fileInfo || !fileInfo.url) {
      alert('파일을 다운로드할 수 없습니다.');
      return;
    }

    try {
      if (fileInfo.url.startsWith('http')) {
        window.open(fileInfo.url, '_blank');
      } else {
        const response = await axios.get(fileInfo.url, {
          responseType: 'blob',
          withCredentials: true
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileInfo.storedName || 'download');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('파일 다운로드에 실패했습니다.');
      console.error(err);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const isOwner = isAuthenticated && user && post && post.email === user.email;

  useEffect(() => {
    if (!params.id) return;
    const cancelSource = axios.CancelToken.source();

    async function loadComments() {
      setCommentsLoading(true);
      setCommentsError(null);
      try {
        const { data } = await axios.get<Comment[]>(`/api/comments/${params.id}`, {
          cancelToken: cancelSource.token,
          headers: { Accept: 'application/json' }
        });
        setComments(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!axios.isCancel(e)) {
          setCommentsError('댓글을 불러오지 못했습니다.');
        }
      } finally {
        setCommentsLoading(false);
      }
    }

    loadComments();
    return () => cancelSource.cancel('Component unmounted');
  }, [params.id]);

  const refreshComments = async () => {
    if (!params.id) return;
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const { data } = await axios.get<Comment[]>(`/api/comments/${params.id}`, {
        headers: { Accept: 'application/json' }
      });
      setComments(Array.isArray(data) ? data : []);
    } catch (e) {
      setCommentsError('댓글을 불러오지 못했습니다.');
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!commentDescription.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }
    if (!isAuthenticated || !user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setSubmittingComment(true);
    try {
      const commentDepth = replyTarget ? getCommentDepth(replyTarget) + 1 : 0;
      await axios.post('/api/comments', {
        description: commentDescription,
        email: user.email,
        postId: params.id,
        parentId: replyTarget ? getCommentId(replyTarget) : null,
        depth: commentDepth
      }, { withCredentials: true });

      setCommentDescription('');
      setReplyTarget(null);
      await refreshComments();
    } catch (e) {
      let message = '댓글 작성에 실패했습니다.';
      if (axios.isAxiosError(e)) {
        message = e.response?.data?.message || e.response?.data || e.message || message;
      }
      alert(message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    const commentId = getCommentId(comment);
    if (commentId !== null) {
      setEditingCommentId(commentId);
      setEditText(comment.description || '');
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText('');
  };

  const handleSaveEdit = async (commentId: number) => {
    if (!editText.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    try {
      await axios.put(`/api/comments/${commentId}`, {
        description: editText
      }, { withCredentials: true });

      setEditingCommentId(null);
      setEditText('');
      await refreshComments();
    } catch (e) {
      let message = '댓글 수정에 실패했습니다.';
      if (axios.isAxiosError(e)) {
        message = e.response?.data?.message || e.response?.data || e.message || message;
      }
      alert(message);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) {
      return;
    }

    setDeletingCommentId(commentId);
    try {
      await axios.delete(`/api/comments/${commentId}`, {
        withCredentials: true
      });
      await refreshComments();
    } catch (e) {
      let message = '댓글 삭제에 실패했습니다.';
      if (axios.isAxiosError(e)) {
        message = e.response?.data?.message || e.response?.data || e.message || message;
      }
      alert(message);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const renderCommentCard = (comment: Comment, depth: number) => {
    const commentId = getCommentId(comment);
    const isCommentOwner = isAuthenticated && user && comment.email === user.email;
    const isEditing = commentId !== null && editingCommentId === commentId;
    const isDeleting = commentId !== null && deletingCommentId === commentId;

    return (
      <div className="border rounded p-3" style={getCommentCardStyle(depth)}>
        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <strong>{comment.email || '익명'}</strong>
            {depth > 0 && (
              <span className="badge bg-secondary bg-opacity-10 text-secondary border-0">
                ↳ 답글
              </span>
            )}
          </div>
          <small className="text-muted">
            {comment.createdDate ? formatDate(comment.createdDate) : ''}
          </small>
        </div>
        {isEditing ? (
          <div className="mb-2">
            <textarea
              className="form-control mb-2"
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => commentId !== null && handleSaveEdit(commentId)}
              >
                저장
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleCancelEdit}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>
              {comment.description}
            </p>
            <div className="d-flex gap-2 flex-wrap">
              {isAuthenticated && (
                <button
                  type="button"
                  className="btn btn-link btn-sm px-0"
                  onClick={() => setReplyTarget(comment)}
                >
                  답글
                </button>
              )}
              {isCommentOwner && (
                <>
                  <button
                    type="button"
                    className="btn btn-link btn-sm px-0 text-primary"
                    onClick={() => handleEditComment(comment)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="btn btn-link btn-sm px-0 text-danger"
                    onClick={() => commentId !== null && handleDeleteComment(commentId)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderCommentTree = (list: Comment[] = [], depth: number = 0): JSX.Element | null => {
    if (!list.length) return null;
    return (
      <div>
        {list.map((comment) => {
          const commentId = getCommentId(comment);
          const hasReplies = comment.comments && comment.comments.length > 0;

          return (
            <div key={commentId || Math.random()} className="mb-3">
              {depth > 0 ? (
                <div className="d-flex align-items-start">
                  <div 
                    className="me-3" 
                    style={{ 
                      width: '2px', 
                      backgroundColor: '#dee2e6',
                      minHeight: '100%',
                      marginTop: '0.5rem'
                    }}
                  />
                  <div className="flex-grow-1">
                    {renderCommentCard(comment, depth)}
                    {hasReplies && (
                      <div className="mt-2">
                        {renderCommentTree(comment.comments || [], depth + 1)}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {renderCommentCard(comment, depth)}
                  {hasReplies && (
                    <div className="mt-2 ms-4">
                      {renderCommentTree(comment.comments || [], depth + 1)}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container my-4">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container my-4">
        <div className="alert alert-danger">
          <h4 className="alert-heading">오류</h4>
          <p>{error}</p>
          <hr />
          <div className="d-flex gap-2">
            {error === '로그인 이후 사용해주세요' ? (
              <Link href="/login" className="btn btn-primary">
                로그인하러 가기
              </Link>
            ) : (
              <button className="btn btn-primary" onClick={() => router.push('/')}>
                목록으로 돌아가기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="container my-4">
      <div className="mb-3">
        <button className="btn btn-secondary" onClick={() => router.back()}>
          ← 뒤로가기
        </button>
      </div>

      <article>
        <header className="mb-4">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h1 className="display-5 mb-0">{post.title}</h1>
            {isOwner && (
              <div className="d-flex gap-2">
                <Link
                  href={`/posts/${params.id}/edit`}
                  className="btn btn-outline-primary btn-sm"
                >
                  수정
                </Link>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            )}
          </div>
          <div className="text-muted mb-3">
            <small>
              작성자: {post.email} | 
              작성일: {formatDate(post.createdDate)} | 
              {post.modifiedDate && ` 수정일: ${formatDate(post.modifiedDate)}`}
              {post.views !== undefined && ` | 조회수: ${post.views}`}
            </small>
          </div>
        </header>

        <div className="card">
          <div className="card-body">
            <div 
              className="post-content ck-content" 
              dangerouslySetInnerHTML={{ __html: post.content || post.body || '내용이 없습니다.' }}
            />
            
            {post.fileInfo && (
              <div className="mt-4 pt-3 border-top">
                <h5 className="mb-3">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    fill="currentColor" 
                    className="bi bi-paperclip me-2" 
                    viewBox="0 0 16 16"
                  >
                    <path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0V3z"/>
                  </svg>
                  첨부파일
                </h5>
                <div className="card bg-light">
                  <div className="card-body d-flex justify-content-between align-items-center">
                    <div className="flex-grow-1">
                      <div className="fw-bold mb-1">
                        {post.fileInfo.originalName}
                      </div>
                      <div className="text-muted small">
                        {formatFileSize(post.fileInfo.fileSize)}
                        {post.fileInfo.contentType && (
                          <span className="ms-2">
                            ({post.fileInfo.contentType})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      <section className="mt-5">
        <h2 className="h4 mb-3">댓글</h2>
        {commentsError && (
          <div className="alert alert-warning">{commentsError}</div>
        )}
        {commentsLoading ? (
          <div className="text-muted">댓글을 불러오는 중...</div>
        ) : (
          <>
            {comments.length === 0 ? (
              <p className="text-muted">아직 댓글이 없습니다.</p>
            ) : (
              renderCommentTree(comments)
            )}
          </>
        )}

        <form className="mt-4" onSubmit={handleCommentSubmit}>
          {replyTarget && (
            <div className="alert alert-secondary py-2 d-flex justify-content-between align-items-center">
              <span>
                <strong>{replyTarget.email || '익명'}</strong> 님에게 답글 작성 중
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setReplyTarget(null)}
              >
                취소
              </button>
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">댓글 내용</label>
            <textarea
              className="form-control"
              rows={3}
              value={commentDescription}
              onChange={(e) => setCommentDescription(e.target.value)}
              placeholder={isAuthenticated ? '내용을 입력하세요.' : '로그인 후 작성 가능합니다.'}
              disabled={!isAuthenticated || submittingComment}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!isAuthenticated || submittingComment}
          >
            {submittingComment ? '등록 중...' : '댓글 등록'}
          </button>
        </form>
      </section>

      <style>{`
        .ck-content {
          line-height: 1.6;
        }
        .ck-content h2 {
          font-size: 1.75rem;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }
        .ck-content h3 {
          font-size: 1.5rem;
          margin-top: 1.25rem;
          margin-bottom: 0.875rem;
        }
        .ck-content p {
          margin-bottom: 1rem;
        }
        .ck-content ul, .ck-content ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .ck-content blockquote {
          border-left: 4px solid #ccc;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #666;
        }
        .ck-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        .ck-content table td, .ck-content table th {
          border: 1px solid #ddd;
          padding: 0.5rem;
        }
        .ck-content a {
          color: #0d6efd;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

// 유틸 함수
function formatDate(d: string): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getCommentId(comment: Comment): number | null {
  if (!comment) return null;
  return comment.id ?? comment.comment_id ?? comment.commentId ?? null;
}

function getCommentDepth(comment: Comment): number {
  if (!comment) return 0;
  return comment.depth ?? comment.comment_depth ?? comment.commentDepth ?? 0;
}

function getCommentCardStyle(depth: number): React.CSSProperties {
  if (!depth) return {};
  const palette = [
    { bg: '#f8f9fa', border: '#0d6efd' },
    { bg: '#f5f7ff', border: '#6f42c1' },
    { bg: '#f4fffb', border: '#20c997' }
  ];
  const index = Math.min(depth - 1, palette.length - 1);
  return {
    backgroundColor: palette[index].bg,
    borderLeft: `4px solid ${palette[index].border}`
  };
}