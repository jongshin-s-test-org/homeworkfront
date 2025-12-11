'use client';

import { useState, useEffect, FormEvent, ChangeEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/app/contexts/AuthContext';

interface LoginForm {
  email: string;
  password: string;
}

// LoginForm 컴포넌트 분리
function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isInitialized } = useAuth();
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace('/');
    }

    const emailParam = searchParams.get('email');
    if (emailParam) {
      setForm((prev) => ({ ...prev, email: emailParam }));
    }
  }, [searchParams, isAuthenticated, isInitialized, router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data } = await axios.post(
        '/api/auth/login',
        {
          email: form.email.trim(),
          password: form.password
        },
        { withCredentials: true }
      );
      
      const userInfo = typeof data === 'string' 
        ? { email: data } 
        : (data.email ? { email: data.email } : data);
      await login(userInfo);
      router.push('/');
      router.refresh();
    } catch (err) {
      let message = '로그인에 실패했습니다.';
      
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data;
        
        // 401 Unauthorized 에러인 경우
        if (err.response?.status === 401) {
          // 백엔드에서 "Login failed" 텍스트를 반환하는 경우
          if (typeof responseData === 'string' && responseData.includes('Login failed')) {
            message = '비밀번호가 올바르지 않습니다.';
          } 
          // Spring Boot 기본 에러 형식 {timestamp, status, error, path}
          else if (responseData && typeof responseData === 'object') {
            message = responseData.error || responseData.message || '비밀번호가 올바르지 않습니다.';
          }
          else {
            message = '비밀번호가 올바르지 않습니다.';
          }
        } 
        // 기타 에러
        else {
          // 객체인 경우 message 또는 error 속성 추출
          if (responseData && typeof responseData === 'object') {
            message = '이메일이 올바르지 않습니다.';
          } 
          // 문자열인 경우 그대로 사용
          else if (typeof responseData === 'string') {
            message = '이메일이 올바르지 않습니다.';
          }
          // 기타 경우 에러 메시지 사용
          else {
            message = '이메일이 올바르지 않습니다.';
          }
        }
      }
      
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container my-5" style={{ maxWidth: 420 }}>
      <h1 className="h3 mb-4">로그인</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">이메일</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="form-label">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="d-grid gap-2">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? '로그인 중...' : '로그인'}
          </button>
          <Link href="/signup" className="btn btn-outline-secondary">
            회원가입
          </Link>
        </div>
      </form>
    </div>
  );
}

// Suspense로 감싸서 export
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="container my-5" style={{ maxWidth: 420 }}>
        <div className="text-center">로딩 중...</div>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}