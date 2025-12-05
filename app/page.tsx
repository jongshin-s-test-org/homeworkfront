'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from './contexts/AuthContext';

interface Post {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  createdDate: string;
  views?: number;
}

interface PostsResponse {
  content: Post[];
  totalPages: number;
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cancelTokenSource = axios.CancelToken.source();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get<PostsResponse>('/api/posts/lists', {
          params: {
            page,
            size: 10,
            sort
          },
          headers: {
            'Accept': 'application/json'
          },
          cancelToken: cancelTokenSource.token,
          withCredentials: true
        });

        if (data.content.length > 0) {
          setPosts(data.content);
        } else {
          throw new Error('empty');
        }

        if (data.totalPages) {
          setTotalPages(data.totalPages);
        }
      } catch (e) {
        if (!axios.isCancel(e)) {
          // 401 Unauthorized 에러인 경우 로그인 메시지 표시
          if (axios.isAxiosError(e) && e.response?.status === 401) {
            setError('로그인 이후 사용해주세요');
          } else if (e instanceof Error && e.message === 'empty') {
            setError(null);
          } else if (e instanceof Error) {
            setError(e.message);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelTokenSource.cancel('Component unmounted');
    };
  }, [page, sort]);

  const formatDate = (d: string): string => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString();
  };

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3">게시물 목록</h1>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-warning">
          {error === '로그인 이후 사용해주세요' ? (
            <>
              <p className="mb-2">{error}</p>
              <Link href="/login" className="btn btn-primary btn-sm">
                로그인하러 가기
              </Link>
            </>
          ) : (
            <>API 오류: {error}</>
          )}
        </div>
      )}

      <div className="mb-3 d-flex justify-content-end">
        <select
          className="form-select w-auto"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="latest">최신순</option>
          <option value="oldest">과거순</option>
          <option value="views">조회수순</option>
        </select>
      </div>

      <ul className="list-group mb-3">
        {posts.map(post => (
          <li key={post.id} className="list-group-item d-flex justify-content-between align-items-start">
            <div>
              <h5 className="mb-1">{post.title}</h5>
              <p className="mb-1 text-muted">{post.excerpt}</p>
              <small className="text-muted">{post.author} • {formatDate(post.createdDate)}</small>
            </div>
            <Link href={`/posts/${post.id}`} className="btn btn-sm btn-primary ms-3">
              보기
            </Link>
          </li>
        ))}
      </ul>

      {/* page navigation */}
      <div style={{ marginTop: '20px' }}>
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          이전
        </button>

        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            style={{
              fontWeight: page === i + 1 ? 'bold' : 'normal',
              margin: '0 5px',
            }}
          >
            {i + 1}
          </button>
        ))}

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
        >
          다음
        </button>
      </div>

      {isAuthenticated && (
        <div
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            zIndex: 1000
          }}
        >
          <button
            className="btn btn-primary"
            onClick={() => router.push('/posts/write')}
            style={{
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              fontSize: '24px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
            title="글쓰기"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}