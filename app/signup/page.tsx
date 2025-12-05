'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
// import { useRouter } from 'next/navigation'; // 오류 해결을 위해 useRouter 사용을 중단하고 window.location으로 대체
// import Link from 'next/link'; // 오류 해결을 위해 Link 사용을 중단하고 <a> 태그로 대체
import axios from 'axios';

// 확장된 폼 데이터 인터페이스
interface SignupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string; // 비밀번호 확인 추가
}

// 확장된 에러 인터페이스
interface FieldErrors {
  name: string;
  email: string;
  password: string;
  confirmPassword: string; // 비밀번호 확인 에러 추가
}

export default function SignupPage() {
  // const router = useRouter(); // useRouter 대신 window.location 사용
  const [form, setForm] = useState<SignupForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '' // 초기 상태 추가
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '' // 에러 상태 추가
  });

  const validateField = (name: keyof SignupForm, value: string): string => {
    let errorMessage = '';
    
    // value는 이미 handleChange에서 공백이 제거된 상태입니다.

    switch (name) {
      case 'name':
        if (!value) {
          errorMessage = '이름은 필수 입력값입니다.';
        } else if (value.length < 2 || value.length > 20) {
          errorMessage = '이름은 2~20자 사이여야 합니다.';
        }
        break;

      case 'email':
        // email 필드에 공백이 있는지 추가 검사 (handleChange에서 이미 처리되지만, 만약을 대비)
        if (/\s/.test(value)) {
          errorMessage = '이메일에는 공백을 입력할 수 없습니다.';
        } else if (!value) {
          errorMessage = '이메일은 필수 입력값입니다.';
        } else if (value.length > 50) { // 길이 제한 (최대 50자)
          errorMessage = '이메일은 50자 이하여야 합니다.';
        } else {
          // 강화된 이메일 정규식: 
          // 1. 기본 형식 체크
          // 2. 도메인(@ 다음)이 숫자로 시작하는 것을 방지 ([a-zA-Z])
          // 예: user@1domain.com (X), user@domain1.com (O)
          const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
          if (!emailRegex.test(value)) {
            errorMessage = '올바른 이메일 형식이 아니며, 도메인은 영문자로 시작해야 합니다.';
          }
        }
        break;

      case 'password':
        if (!value) {
          errorMessage = '비밀번호는 필수 입력값입니다.';
        } else if (value.length < 8 || value.length > 20) {
          errorMessage = '비밀번호는 8~20자 사이여야 합니다.';
        }
        break;
        
      case 'confirmPassword':
        if (!value) {
          errorMessage = '비밀번호 확인은 필수 입력값입니다.';
        } else if (value !== form.password) { // 비밀번호 일치 확인
          errorMessage = '비밀번호가 일치하지 않습니다.';
        }
        break;

      default:
        break;
    }

    return errorMessage;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value: rawValue } = e.target;
    
    // 모든 필드에서 공백 제거: 띄어쓰기를 허용하지 않음 (이메일 포함)
    const value = rawValue.replace(/\s/g, ''); 

    setForm((prev) => ({
      ...prev,
      [name]: value // 공백이 제거된 값으로 상태 업데이트
    }));

    // 공백이 제거된 값으로 유효성 검사
    const errorMessage = validateField(name as keyof SignupForm, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: errorMessage
    }));
    
    // 비밀번호가 변경될 경우, 비밀번호 확인 필드를 다시 검사 (실시간 매칭 피드백)
    if (name === 'password') {
      // form.confirmPassword는 이전 상태 값이므로, 현재 form 상태를 사용
      const confirmError = validateField('confirmPassword', form.confirmPassword);
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: confirmError
      }));
    }
    // 비밀번호 확인이 변경될 경우, 해당 필드만 다시 검사
    if (name === 'confirmPassword') {
        const confirmError = validateField('confirmPassword', value);
        setFieldErrors((prev) => ({
            ...prev,
            confirmPassword: confirmError
        }));
    }
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // value는 이미 공백이 제거된 상태이므로 추가 처리 불필요
    const errorMessage = validateField(name as keyof SignupForm, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: errorMessage
    }));
    // 비밀번호 blur 시, 비밀번호 확인 필드도 검사
    if (name === 'password' || name === 'confirmPassword') {
      const confirmError = validateField('confirmPassword', form.confirmPassword);
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: confirmError
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {
      // form 상태는 이미 공백이 제거된 값으로 채워져 있음
      name: validateField('name', form.name),
      email: validateField('email', form.email),
      password: validateField('password', form.password),
      confirmPassword: validateField('confirmPassword', form.confirmPassword) // 폼 검사에 추가
    };

    setFieldErrors(errors);

    return !Object.values(errors).some(error => error !== '');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // form 값은 이미 공백이 제거된 상태입니다.
      await axios.post(
        '/api/members/signup',
        {
          name: form.name, // trim() 대신 공백 제거된 form 값 사용
          email: form.email, // trim() 대신 공백 제거된 form 값 사용
          password: form.password
        },
        { withCredentials: true }
      );
      
      // router.push 대신 window.location 사용으로 변경 (오류 해결)
      window.location.href = `/login?email=${encodeURIComponent(form.email)}`;
      
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.errors) {
        // 백엔드에서 받은 에러 처리
        const backendErrors = err.response.data.errors;
        setFieldErrors((prev) => ({
          ...prev,
          ...backendErrors
        }));
      } else {
        let message = '회원가입에 실패했습니다.';
        if (axios.isAxiosError(err)) {
          message = err.response?.data?.message || err.response?.data || err.message || message;
        }
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // Tailwind CSS 대신 Bootstrap 클래스 기반 스타일 유지
    <div className="container my-5" style={{ maxWidth: 480 }}>
      <h1 className="h3 mb-4">회원가입</h1>
      <form onSubmit={handleSubmit} noValidate>
        {/* 이름 입력 */}
        <div className="mb-3">
          <label htmlFor="name" className="form-label">이름</label>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
            required
            minLength={2}
            maxLength={20}
          />
          {fieldErrors.name && (
            <div className="invalid-feedback d-block">
              {fieldErrors.name}
            </div>
          )}
          <small className="form-text text-muted">
            2~20자 사이로 입력해주세요.
          </small>
        </div>

        {/* 이메일 입력 */}
        <div className="mb-3">
          <label htmlFor="email" className="form-label">이메일</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
            required
            maxLength={50}
          />
          {fieldErrors.email && (
            <div className="invalid-feedback d-block">
              {fieldErrors.email}
            </div>
          )}
          <small className="form-text text-muted">
            최대 50자까지 입력 가능하며, 도메인 주소는 영문자로 시작해야 합니다.
          </small>
        </div>

        {/* 비밀번호 입력 */}
        <div className="mb-3">
          <label htmlFor="password" className="form-label">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
            required
            minLength={8}
            maxLength={20}
          />
          {fieldErrors.password && (
            <div className="invalid-feedback d-block">
              {fieldErrors.password}
            </div>
          )}
          <small className="form-text text-muted">
            8~20자 사이로 입력해주세요.
          </small>
        </div>
        
        {/* 비밀번호 확인 입력 */}
        <div className="mb-4">
          <label htmlFor="confirmPassword" className="form-label">비밀번호 확인</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-control ${fieldErrors.confirmPassword ? 'is-invalid' : ''}`}
            required
            minLength={8}
            maxLength={20}
          />
          {fieldErrors.confirmPassword && (
            <div className="invalid-feedback d-block">
              {fieldErrors.confirmPassword}
            </div>
          )}
          <small className="form-text text-muted">
            비밀번호를 다시 한번 입력해주세요. (띄어쓰기 불가)
          </small>
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
            {submitting ? '가입 중...' : '회원가입'}
          </button>
          
          {/* Link 대신 표준 <a> 태그 사용 (오류 해결) */}
          <a href="/login" className="btn btn-outline-secondary">
            로그인으로 돌아가기
          </a>
        </div>
      </form>
    </div>
  );
}