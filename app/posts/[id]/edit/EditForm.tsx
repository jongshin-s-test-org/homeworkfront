'use client';

import { use, useRef, useState, useEffect, FormEvent, ChangeEvent, useMemo } from 'react';
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

interface ExistingFile {
  name: string;
  url: string;
}

interface PostEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PostEditPage({ params }: PostEditPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [form, setForm] = useState<FormData>({
    title: '',
    content: '',
    isRelease: true
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFile, setExistingFile] = useState<ExistingFile | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    title: '',
    content: '',
    isRelease: '',
    file: ''
  });

  const quillRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!resolvedParams.id || !isAuthenticated) return;

    const loadPost = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get(`/api/posts/${resolvedParams.id}`, {
          withCredentials: true
        });

        if (data.email !== user?.email) {
          setError('수정 권한이 없습니다.');
          setLoading(false);
          return;
        }

        setForm({
          title: data.title || '',
          content: data.content || data.body || '',
          isRelease: data.isRelease !== undefined ? data.isRelease : data.isReleased !== undefined ? data.isReleased : true
        });
        
        if (data.fileInfo && (data.fileInfo.storedName || data.fileInfo.url)) {
          setExistingFile({
            name: data.fileInfo.originalName,
            url: data.fileInfo.url
          });
        }
      } catch (err) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            setError('로그인 이후 사용해주세요');
          } else if (err.response?.status === 404) {
            setError('게시물을 찾을 수 없습니다.');
          } else {
            setError(err.response?.data?.message || err.message || '게시물을 불러오는데 실패했습니다.');
          }
        } else if (err instanceof Error) {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [resolvedParams.id, isAuthenticated, user]);

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
      setRemoveFile(false);
      setFieldErrors((prev) => ({
        ...prev,
        file: ''
      }));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setRemoveFile(true);
    setFieldErrors((prev) => ({
      ...prev,
      file: ''
    }));
    
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveExistingFile = () => {
    setRemoveFile(true);
    setExistingFile(null);
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
    
    if (!isAuthenticated) {
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
        isRelease: form.isRelease,
        removeFile: removeFile
      };
      
      formData.append('dto', new Blob([JSON.stringify(dto)], {
        type: 'application/json'
      }));

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await axios.put(
        `/api/posts/${resolvedParams.id}`,
        formData,
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      router.push(`/posts/${resolvedParams.id}`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.errors) {
        const backendErrors = err.response.data.errors;
        setFieldErrors((prev) => ({
          ...prev,
          ...backendErrors
        }));
      } else {
        let message = '게시물 수정에 실패했습니다.';
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

  if (error && !form.title) {
    return (
      <div className="container my-4">
        <div className="alert alert-danger">
          <h4 className="alert-heading">오류</h4>
          <p>{error}</p>
          <hr />
          <button className="btn btn-primary" onClick={() => router.back()}>
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-4" style={{ maxWidth: '800px' }}>
      <div className="mb-3">
        <button className="btn btn-secondary" onClick={() => router.back()}>
          ← 뒤로가기
        </button>
      </div>

      <h1 className="h3 mb-4">게시물 수정</h1>

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
                {existingFile && !removeFile && (
                  <div className="alert alert-info d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <strong>현재 파일:</strong> {existingFile.name}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={handleRemoveExistingFile}
                    >
                      삭제
                    </button>
                  </div>
                )}

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
                      <strong>새 파일:</strong> {selectedFile.name} 
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
            {submitting ? '수정 중...' : '수정하기'}
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