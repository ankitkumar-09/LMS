'use client';

import { useRef, useState } from 'react';
import { uploadImage, UploadError } from '@/lib/utils/cloudinary';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

/**
 * Attach an image to a question: click to browse, drag a file in, paste from the
 * clipboard (Ctrl/Cmd+V on a screenshot), or paste a direct URL.
 */
export default function ImageUpload({ value, onChange, label = 'Question image (optional)' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFile = async (file: File | Blob | undefined | null, name?: string) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadImage(file, name);
      onChange(url);
    } catch (err) {
      const msg = err instanceof UploadError ? err.message : 'Upload failed. Please try again.';
      setError(msg);
      setShowUrlInput(true);
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (item) {
      e.preventDefault();
      handleFile(item.getAsFile());
      return;
    }
    const text = e.clipboardData.getData('text').trim();
    if (/^https?:\/\//i.test(text)) {
      e.preventDefault();
      onChange(text);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0], e.dataTransfer.files?.[0]?.name);
  };

  if (value) {
    return (
      <div>
        {label && <label className="block text-xs text-gray-500 mb-1">{label}</label>}
        <div className="relative inline-block border border-gray-300 rounded-lg p-2 bg-gray-50 max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Question attachment" className="max-h-48 max-w-full rounded" />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => { onChange(''); setError(''); }}
              className="text-xs px-3 py-1.5 rounded-md bg-white border border-gray-300 text-red-600 hover:bg-red-50 font-semibold"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold"
            >
              Replace
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0], e.target.files?.[0]?.name)}
          />
        </div>
        <p className="mt-1 text-[11px] text-gray-400 break-all">{value}</p>
      </div>
    );
  }

  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-1">{label}</label>}

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onPaste={handlePaste}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        tabIndex={0}
        role="button"
        className={`w-full rounded-lg border-2 border-dashed px-4 py-5 text-center cursor-pointer transition-colors outline-none focus:border-[#1565c0] ${
          dragging ? 'border-[#1565c0] bg-blue-50' : 'border-gray-300 hover:border-[#1565c0] bg-white'
        } ${uploading ? 'opacity-60 cursor-wait' : ''}`}
      >
        {uploading ? (
          <p className="text-sm text-gray-500 font-medium">Uploading…</p>
        ) : (
          <>
            <p className="text-sm text-gray-600 font-medium">
              Click to upload, drag an image here, or paste a screenshot
            </p>
            <p className="text-[11px] text-gray-400 mt-1">PNG, JPG or WebP — up to 10 MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0], e.target.files?.[0]?.name)}
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={() => setShowUrlInput(v => !v)}
        className="mt-2 text-xs text-[#1565c0] hover:underline font-semibold"
      >
        {showUrlInput ? 'Hide URL field' : 'Or paste an image URL'}
      </button>

      {showUrlInput && (
        <input
          type="url"
          onChange={e => onChange(e.target.value.trim())}
          placeholder="https://res.cloudinary.com/…/question.png"
          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#1565c0] focus:outline-none"
        />
      )}
    </div>
  );
}
