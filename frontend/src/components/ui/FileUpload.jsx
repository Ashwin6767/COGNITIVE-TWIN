'use client';
import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image as ImageIcon, File } from 'lucide-react';
import clsx from 'clsx';

function getFileIcon(file) {
  if (file.type.startsWith('image/')) return ImageIcon;
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return FileText;
  return File;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ label, error, multiple = true, required, onChange, value = [], accept, className = '' }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback((newFiles) => {
    const updated = multiple ? [...value, ...Array.from(newFiles)] : Array.from(newFiles).slice(0, 1);
    onChange?.(updated);
  }, [value, multiple, onChange]);

  const removeFile = useCallback((index) => {
    const updated = value.filter((_, i) => i !== index);
    onChange?.(updated);
  }, [value, onChange]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-[#0F172A]">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors',
          dragging ? 'border-blue-400 bg-blue-50' : 'border-[#E2E8F0] hover:border-blue-300 hover:bg-[#F8FAFC]',
          error ? 'border-red-400' : ''
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept || 'image/*,.pdf,.doc,.docx,.xls,.xlsx'}
          className="hidden"
          onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
        />
        <Upload className="w-6 h-6 text-[#94A3B8] mx-auto mb-2" />
        <p className="text-sm font-medium text-[#475569]">
          {dragging ? 'Drop files here' : 'Click or drag files to upload'}
        </p>
        <p className="text-xs text-[#94A3B8] mt-0.5">
          {multiple ? 'Multiple files supported' : 'Single file'} · Images, PDF, Word, Excel
        </p>
      </div>

      {value.length > 0 && (
        <ul className="space-y-2 mt-2">
          {value.map((file, i) => {
            const Icon = getFileIcon(file);
            const isImage = file.type.startsWith('image/');
            const preview = isImage ? URL.createObjectURL(file) : null;
            return (
              <li key={i} className="flex items-center gap-3 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                {isImage && preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt={file.name} className="w-10 h-10 object-cover rounded" />
                ) : (
                  <div className="w-10 h-10 rounded bg-[#E2E8F0] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#64748B]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F172A] truncate">{file.name}</p>
                  <p className="text-xs text-[#94A3B8]">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="p-1 rounded hover:bg-red-100 text-[#94A3B8] hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
