'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { uploadImage, UploadError } from '@/lib/utils/cloudinary';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

/**
 * Only one uploader on the page may be armed for pasting at a time. Arming a new
 * one broadcasts this event so any previously armed uploader disarms itself.
 */
const ARM_EVENT = 'imageupload:arm';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
const PASTE_HINT = isMac ? '⌘V' : 'Ctrl+V';

/**
 * Attach an image to a question: click to browse, drag a file in, arm the uploader
 * and paste a screenshot with Ctrl/Cmd+V, or paste a direct URL.
 */
export default function ImageUpload({ value, onChange, label = 'Question image (optional)' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [armed, setArmed] = useState(false);
  const uid = useId();

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

  // Always call the freshest handlers from the long-lived document listener,
  // so a re-render can't leave it uploading into the wrong question.
  const latest = useRef({ handleFile, onChange });
  useEffect(() => {
    latest.current = { handleFile, onChange };
  });

  // While armed, listen for paste on the whole document. Previously paste only
  // worked when the drop zone had focus — but clicking it opened the file picker,
  // so there was no way to focus it and Cmd+V never fired.
  useEffect(() => {
    if (!armed) return;

    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Don't hijack pasting into a text field
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      const items = Array.from(e.clipboardData?.items ?? []);
      const img = items.find(i => i.type.startsWith('image/'));
      if (img) {
        e.preventDefault();
        e.stopPropagation();
        latest.current.handleFile(img.getAsFile(), 'pasted-screenshot.png');
        setArmed(false);
        return;
      }
      const text = e.clipboardData?.getData('text')?.trim();
      if (text && /^https?:\/\//i.test(text)) {
        e.preventDefault();
        e.stopPropagation();
        latest.current.onChange(text);
        setError('');
        setArmed(false);
      } else {
        setError('No image found in the clipboard. Take a screenshot, then paste.');
        setTimeout(() => setError(''), 3000);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setArmed(false);
    };

    // Another uploader took over
    const onArmElsewhere = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== uid) setArmed(false);
    };

    // Capture phase so we handle it before React's delegated onPaste and can
    // stop propagation — otherwise the drop zone's own handler fires too and
    // the same screenshot uploads twice.
    document.addEventListener('paste', onPaste, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener(ARM_EVENT, onArmElsewhere);
    return () => {
      document.removeEventListener('paste', onPaste, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(ARM_EVENT, onArmElsewhere);
    };
  }, [armed, uid]);

  const arm = () => {
    window.dispatchEvent(new CustomEvent(ARM_EVENT, { detail: uid }));
    setArmed(true);
    setError('');
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
            <button
              type="button"
              onClick={() => (armed ? setArmed(false) : arm())}
              className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors ${
                armed
                  ? 'bg-[#1a237e] text-white'
                  : 'bg-indigo-50 text-[#1a237e] hover:bg-indigo-100'
              }`}
            >
              {armed ? `Waiting for ${PASTE_HINT}…` : `Paste to replace (${PASTE_HINT})`}
            </button>
          </div>
          {uploading && <p className="mt-2 text-xs text-gray-500 font-medium">Uploading…</p>}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
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
        onPaste={armed ? undefined : handlePaste}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        tabIndex={0}
        role="button"
        className={`w-full rounded-lg border-2 border-dashed px-4 py-5 text-center cursor-pointer transition-colors outline-none ${
          armed
            ? 'border-[#1a237e] bg-indigo-50'
            : dragging
              ? 'border-[#1565c0] bg-blue-50'
              : 'border-gray-300 hover:border-[#1565c0] bg-white'
        } ${uploading ? 'opacity-60 cursor-wait' : ''}`}
      >
        {uploading ? (
          <p className="text-sm text-gray-500 font-medium">Uploading…</p>
        ) : armed ? (
          <>
            <p className="text-sm text-[#1a237e] font-bold">
              Ready — press {PASTE_HINT} to paste your screenshot
            </p>
            <p className="text-[11px] text-gray-500 mt-1">Esc to cancel</p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 font-medium">
              Click to upload, or drag an image here
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

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (armed ? setArmed(false) : arm())}
          className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${
            armed
              ? 'bg-[#1a237e] text-white'
              : 'bg-indigo-50 text-[#1a237e] hover:bg-indigo-100'
          }`}
        >
          {armed ? `Waiting for ${PASTE_HINT}…` : `📋 Paste screenshot (${PASTE_HINT})`}
        </button>

        <button
          type="button"
          onClick={() => setShowUrlInput(v => !v)}
          className="text-xs text-[#1565c0] hover:underline font-semibold"
        >
          {showUrlInput ? 'Hide URL field' : 'Or paste an image URL'}
        </button>
      </div>

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
