'use client';

import { useRef, useState, useEffect, FormEvent, ChangeEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/contexts/AuthContext';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import '@iwanmastah/quill-table-better/dist/quill-table-better.css'
import { Quill } from 'react-quill-new';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

import QuillBetterTable from '@iwanmastah/quill-table-better';
Quill.register({
  'modules/better-table': QuillBetterTable
}, true);


interface FormData {
  title: string;
  content: string;
  isRelease: boolean;
}

interface FieldErrors {
  title: string;
  content: string;
  isRelease: string;
  file: string;
}

export default function PostWritePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [form, setForm] = useState<FormData>({
    title: '',
    content: '',
    isRelease: true
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    title: '',
    content: '',
    isRelease: '',
    file: ''
  });
  const [quillReady, setQuillReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const quillRef = useRef(null);
  // Quill 모듈 설정
  const modules = {
    toolbar: [
        // Other toolbar options
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
        // Table-specific buttons
        [{ 'table': 'insertTable' }],
    ],
    'better-table': {
      toolbar: true,
      operationMenu: {
        items: {
          unmergeCells: {
            text: 'Another unmerge cells name'
          }
        }
      }
    },
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list',
    'blockquote', 'code-block',
    'align',
    'link', 'image',
    'color', 'background',
    'table'
  ];

  const validateField = (name: keyof FormData, value: string | boolean): string => {
    let errorMessage = '';

    switch (name) {
      case 'title':
        const trimmedTitle = typeof value === 'string' ? value.trim() : '';
        if (!trimmedTitle) {
          errorMessage = '제목은 필수 입력값입니다.';
        } else if (trimmedTitle.length < 2 || trimmedTitle.length > 100) {
          errorMessage = '제목은 2~100자 사이여야 합니다.';
        }
        break;

      case 'content':
 

        const trimmedContent = typeof value === 'string' 
        ? value.replace(/<[^>]*>/g, '').trim() 
        : '';
        
        if (!trimmedContent) {
          errorMessage = '내용은 필수 입력값입니다.';
        } else if (trimmedContent.length < 5) {
          errorMessage = '내용은 5자 이상이어야 합니다.';
        } else if (trimmedContent.length > 60000) {
          errorMessage = '내용은 60000자 이하여야 합니다.';
        }
        break;

      case 'isRelease':
        if (value === null || value === undefined) {
          errorMessage = '공개 여부는 필수 입력값입니다.';
        }
        break;

      default:
        break;
    }

    return errorMessage;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setForm((prev) => ({
      ...prev,
      [name]: newValue
    }));

    const errorMessage = validateField(name as keyof FormData, newValue);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: errorMessage
    }));
  };

  const handleEditorChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      content: value
    }));

    const errorMessage = validateField('content', value);
    setFieldErrors((prev) => ({
      ...prev,
      content: errorMessage
    }));
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const errorMessage = validateField(name as keyof FormData, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: errorMessage
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 1 * 1024 * 1024;
      if (file.size > maxSize) {
        setFieldErrors((prev) => ({
          ...prev,
          file: '파일 크기는 1MB 이하여야 합니다.'
        }));
        e.target.value = '';
        return;
      }

      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
      const fileName = file.name.toLowerCase();
      const fileExtension = fileName.substring(fileName.lastIndexOf('.') + 1);
      
      if (!allowedExtensions.includes(fileExtension)) {
        setFieldErrors((prev) => ({
          ...prev,
          file: '이미지 파일만 업로드 가능합니다. (jpg, jpeg, png, gif, bmp, webp, svg)'
        }));
        e.target.value = '';
        return;
      }

      setSelectedFile(file);
      setFieldErrors((prev) => ({
        ...prev,
        file: ''
      }));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFieldErrors((prev) => ({
      ...prev,
      file: ''
    }));
  
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReleaseToggle = (isRelease: boolean) => {
    setForm((prev) => ({
      ...prev,
      isRelease
    }));
    setFieldErrors((prev) => ({
      ...prev,
      isRelease: ''
    }));
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {
      title: validateField('title', form.title),
      content: validateField('content', form.content),
      isRelease: validateField('isRelease', form.isRelease),
      file: ''
    };

    setFieldErrors(errors);

    return !Object.values(errors).some(error => error !== '');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!validateForm()) {
      setError('입력값을 확인해주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      
      const dto = {
        title: form.title.trim(),
        content: form.content.trim(),
        email: user.email,
        isRelease: form.isRelease
      };
      
      formData.append('dto', new Blob([JSON.stringify(dto)], {
        type: 'application/json'
      }));

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const { data } = await axios.post<number>(
        '/api/posts',
        formData,
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      router.push(`/posts/${data}`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.errors) {
        const backendErrors = err.response.data.errors;
        setFieldErrors((prev) => ({
          ...prev,
          ...backendErrors
        }));
      } else {
        let message = '게시물 작성에 실패했습니다.';
        if (axios.isAxiosError(err)) {
          message = err.response?.data?.message || err.response?.data || err.message || message;
        }
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container my-4" style={{ maxWidth: '800px' }}>
      <div className="mb-3">
        <button className="btn btn-secondary" onClick={() => router.back()}>
          ← 뒤로가기
        </button>
      </div>

      <h1 className="h3 mb-4">게시물 작성</h1>

      <form onSubmit={handleSubmit} noValidate>
        <table className="table table-bordered">
          <tbody>
            <tr>
              <th style={{ width: '150px', verticalAlign: 'middle', backgroundColor: '#f8f9fa' }}>
                제목 <span className="text-danger">*</span>
              </th>
              <td>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-control ${fieldErrors.title ? 'is-invalid' : ''}`}
                  required
                  placeholder="제목을 입력하세요"
                  minLength={2}
                  maxLength={100}
                />
                {fieldErrors.title && (
                  <div className="invalid-feedback d-block">
                    {fieldErrors.title}
                  </div>
                )}
                <small className="form-text text-muted">
                  2~100자 사이로 입력해주세요. (현재: {form.title.trim().length}자)
                </small>
              </td>
            </tr>

            <tr>
              <th style={{ verticalAlign: 'top', paddingTop: '15px', backgroundColor: '#f8f9fa' }}>
                내용 <span className="text-danger">*</span>
              </th>
              <td>
                <div className="editor-wrapper">
                  <ReactQuill
                    theme="snow"
                    value={form.content}
                    onChange={handleEditorChange}
                    modules={modules}
                    formats={formats}
                    placeholder="내용을 입력하세요 (최소 5자 이상)"
                    bounds="#editor-container"
                    style={{ height: '300px', marginBottom: '50px' }}
                  />
                </div>
                {fieldErrors.content && (
                  <div className="text-danger small mt-1">
                    {fieldErrors.content}
                  </div>
                )}
                <small className="form-text text-muted d-block mt-2">
                  5~60000자 사이로 입력해주세요.<br/>
                  <strong>테이블 사용법:</strong> 툴바의 테이블 버튼으로 표 삽입 후, 표 클릭 시 메뉴를 열 수 있습니다.
                </small>
              </td>
            </tr>

            <tr>
              <th style={{ verticalAlign: 'middle', backgroundColor: '#f8f9fa' }}>
                첨부파일
              </th>
              <td>
                <input
                  id="file"
                  name="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className={`form-control ${fieldErrors.file ? 'is-invalid' : ''}`}
                  disabled={submitting}
                  accept="image/*"
                />
                
                {fieldErrors.file && (
                  <div className="invalid-feedback d-block">
                    {fieldErrors.file}
                  </div>
                )}
                
                {selectedFile && !fieldErrors.file && (
                  <div className="alert alert-success d-flex justify-content-between align-items-center mt-2 mb-0">
                    <div>
                      <strong>선택된 파일:</strong> {selectedFile.name}
                      <span className="text-muted ms-2">
                        ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={handleRemoveFile}
                    >
                      제거
                    </button>
                  </div>
                )}
                
                <small className="form-text text-muted d-block mt-2">
                  이미지 파일만 업로드 가능합니다. (최대 1MB, jpg/jpeg/png/gif/bmp/webp/svg)
                </small>
              </td>
            </tr>

            <tr>
              <th style={{ verticalAlign: 'middle', backgroundColor: '#f8f9fa' }}>
                공개 설정 <span className="text-danger">*</span>
              </th>
              <td>
                <div className="btn-group" role="group">
                  <button
                    type="button"
                    className={`btn ${form.isRelease ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => handleReleaseToggle(true)}
                    disabled={submitting}
                  >
                    공개
                  </button>
                  <button
                    type="button"
                    className={`btn ${!form.isRelease ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={() => handleReleaseToggle(false)}
                    disabled={submitting}
                  >
                    비공개
                  </button>
                </div>
                {fieldErrors.isRelease && (
                  <div className="text-danger small mt-2">
                    {fieldErrors.isRelease}
                  </div>
                )}
                <div className="mt-2">
                  <small className="form-text text-muted">
                    {form.isRelease ? '모든 사용자가 게시글을 볼 수 있습니다.' : '나만 게시글을 볼 수 있습니다.'}
                  </small>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.back()}
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? '작성 중...' : '작성하기'}
          </button>
        </div>
      </form>

      <style jsx global>{`
        .ql-snow .ql-editor table {
          border-collapse: collapse;
          width: 100%;
        }
        .ql-snow .ql-editor table td,
        .ql-snow .ql-editor table th {
          border: 1px solid #ddd;
          padding: 8px;
        }
        .ql-snow .ql-editor table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .ql-snow .ql-editor table tr:hover {
          background-color: #f5f5f5;
        }
        .editor-wrapper {
          position: relative !important;
          overflow: visible !important;
        }

      `}</style>
    </div>
  );
}