'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

export default function Navbar() {
  const { user, loadingUser, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container">
        <Link className="navbar-brand" href="/">
          게시판
        </Link>
        <div className="ms-auto">
          {isAuthenticated ? (
            <div className="d-flex align-items-center gap-3">
              <span className="text-muted">
                {user?.email || '사용자'}
              </span>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          ) : !loadingUser ? (
            <div className="d-flex gap-2">
              <Link className="btn btn-outline-primary" href="/login">
                로그인
              </Link>
              <Link className="btn btn-primary" href="/signup">
                회원가입
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}