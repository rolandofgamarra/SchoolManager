import { useRef, useState } from 'react';
import { X, Camera, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: Props) {
  const { user, accessToken, setAvatarUrl } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<string | null>(user?.avatar_url ?? null);

  const initials = user ? user.username.substring(0, 2).toUpperCase() : 'US';

  // Parsea la respuesta de forma segura: nunca explota si el body está vacío o es HTML
  const safeJson = async (res: Response): Promise<any> => {
    try {
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(false);

    // Validación client-side antes de enviar
    if (file.size > 2 * 1024 * 1024) {
      setError('El archivo no puede superar 2 MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Formato no permitido. Usá JPG, PNG o WebP.');
      return;
    }

    // Previsualización local inmediata (no espera al servidor)
    setPreview(URL.createObjectURL(file));

    const form = new FormData();
    form.append('avatar', file);

    setUploading(true);
    try {
      const res = await fetch('/api/users/avatar/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data.detail || data.avatar?.[0] || `Error del servidor (${res.status})`);
      }
      setAvatarUrl(data.avatar_url ?? null);
      setPreview(data.avatar_url ?? null);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? 'No se pudo conectar con el servidor.');
      setPreview(user?.avatar_url ?? null);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setError(null);
    setSuccess(false);
    setRemoving(true);
    try {
      const res = await fetch('/api/users/avatar/', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data.detail || `Error del servidor (${res.status})`);
      }
      setAvatarUrl(null);
      setPreview(null);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? 'No se pudo conectar con el servidor.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Mi perfil</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="relative group">
            {preview ? (
              <img
                src={preview}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-indigo-100">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
            >
              {uploading
                ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                : <Camera className="w-6 h-6 text-white" />}
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="text-center">
            <p className="font-semibold text-gray-900">{user?.username}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Foto actualizada correctamente.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {uploading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Camera className="w-4 h-4" />}
            {uploading ? 'Subiendo...' : 'Cambiar foto'}
          </button>
          {preview && (
            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-60 transition-colors"
            >
              {removing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Trash2 className="w-4 h-4" />}
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-400 text-center">
          JPG, PNG o WebP · máx. 2 MB
        </p>
      </div>
    </div>
  );
}
