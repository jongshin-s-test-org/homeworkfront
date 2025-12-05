'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface Post {
  id: number;
  title: string;
  content: string;
  views: number;
  isRelease: boolean;
  email: string; // author
  createdDate: string;
  lastModifiedDate: string;
}

interface PostsResponse {
  content: Post[];
  totalPages: number;
}

export default function Home() {
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
          params: { page, size: 10, sort },
          headers: { Accept: 'application/json' },
          cancelToken: cancelTokenSource.token,
          withCredentials: true,
        });

        setPosts(data.content);
        setTotalPages(data.totalPages);
      } catch (e) {
        console.error(e);
        setError('API 요청 실패');
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => cancelTokenSource.cancel('unmounted');
  }, [page, sort]);

  const shortContent = (text: string) => {
    if (!text) return '';
    return text.length > 20 ? text.substring(0, 20) + '...' : text;
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString();
  };

  return (
    <div className="container my-4">
      <h1 className="h3 mb-3">게시물 목록</h1>

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

      {loading && <p>불러오는 중...</p>}
      {error && <p className="text-danger">{error}</p>}

      {/* ----------- 테이블 표시 ----------- */}
      <table className="table table-bordered table-hover">
        <thead className="table-light">
          <tr>
            <th>번호</th>
            <th>작성자</th>
            <th>제목</th>
            <th>내용 (20자)</th>
            <th>공개/비공개 여부</th>
            <th>조회수</th>
            <th>등록일</th>
            <th>수정일</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td>{post.id}</td>
              <td>{post.email}</td>
              <td>
                <Link href={`/posts/${post.id}`} className="text-primary">
                  {post.title}
                </Link>
              </td>
              <td>{shortContent(post.content)}</td>
              <td>{post.isRelease ? '공개' : '비공개'}</td>
              <td>{post.views}</td>
              <td>{formatDate(post.createdDate)}</td>
              <td>{formatDate(post.lastModifiedDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ----------- 페이지네이션 ----------- */}
      <div className="mt-3">
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

        <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
          다음
        </button>
      </div>
    </div>
  );
}
