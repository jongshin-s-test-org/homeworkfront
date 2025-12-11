'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/contexts/AuthContext';

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
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [releaseFilter, setReleaseFilter] = useState("all");
  const [titleKeyword, setTitleKeyword] = useState("");
  const [contentKeyword, setContentKeyword] = useState("");
  const [emailKeyword, setEmailKeyword] = useState("");
  const isReleaseParam = releaseFilter === "private" ? false : releaseFilter === "all" ? null : true;

  const [filterParams, setFilterParams] = useState({
    release: "all",
    title: "",
    content: "",
    email: ""
  });

  useEffect(() => {
    // 로그인하지 않은 경우 API 호출하지 않음
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const cancelTokenSource = axios.CancelToken.source();
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get<PostsResponse>('/api/posts/lists', {
          params: { page, 
            size: 10, 
            sort,
            isRelease: isReleaseParam,
            title: filterParams.title,
            content: filterParams.content,
            author: filterParams.email,
          },
          headers: { Accept: 'application/json' },
          cancelToken: cancelTokenSource.token,
          withCredentials: true,
        });

        if (isMounted) {
          setPosts(data.content);
          setTotalPages(data.totalPages);
        }
      } catch (e) {
        if (axios.isCancel(e)) {
          console.log('Request canceled:', e.message);
        } else if (isMounted) {
          console.error(e);
          setError('API 요청 실패');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();
    
    return () => {
      isMounted = false;
      cancelTokenSource.cancel('Component unmounted');
    };
  }, [page, sort, filterParams, isAuthenticated]);

  const shortContent = (text: string) => {
    if (!text) return '';
    return text.length > 20 ? text.substring(0, 20) + '...' : text;
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString();
  };

  // 로그인하지 않은 경우 안내 메시지 표시
  if (!isAuthenticated) {
    return (
      <div className="container my-4">
        <div className="alert alert-warning text-center" role="alert">
          <h4 className="alert-heading">로그인이 필요합니다</h4>
          <p>게시물 목록을 보려면 로그인해주세요.</p>
          <hr />
          <button 
            className="btn btn-primary"
            onClick={() => router.push('/login')}
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-4">
      <h1 className="h3 mb-3">게시물 목록</h1>

      {/* ----------- 검색 & 필터 UI ----------- */}
      <div className="mb-3 d-flex justify-content-center gap-2 flex-wrap">

        {/* 🔹 공개 여부 */}
        <select
          className="form-select w-auto"
          value={releaseFilter}
          onChange={(e) => setReleaseFilter(e.target.value)}
        >
          <option value="all">공개여부</option>
          <option value="release">공개</option>
          <option value="private">비공개</option>
        </select>

        {/* 🔹 제목 검색 */}
        <input
          type="text"
          className="form-control w-auto"
          placeholder="제목 검색"
          value={titleKeyword}
          onChange={(e) => setTitleKeyword(e.target.value)}
          style={{ width: "200px" }}
        />

        {/* 🔹 내용 검색 */}
        <input
          type="text"
          className="form-control w-auto"
          placeholder="내용 검색"
          value={contentKeyword}
          onChange={(e) => setContentKeyword(e.target.value)}
          style={{ width: "200px" }}
        />

        {/* 🔹 작성자 검색 */}
        <input
          type="text"
          className="form-control w-auto"
          placeholder="작성자 검색"
          value={emailKeyword}
          onChange={(e) => setEmailKeyword(e.target.value)}
          style={{ width: "200px" }}
        />

        {/* 🔹 검색버튼 */}
        <button
          className="btn btn-primary"
          onClick={() => {
            setFilterParams({
              release: releaseFilter,
              title: titleKeyword,
              content: contentKeyword,
              email: emailKeyword
            });
            setPage(1);
          }}
        >
          검색
        </button>
      </div>

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
      <div className="mt-3" style={{ textAlign: "center" }}>
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
    </div>
  );
}