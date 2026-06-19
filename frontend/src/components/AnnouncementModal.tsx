import { API_BASE } from '../lib/api';
import { useState } from 'react';
import { X, Send, Users } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict: any;
}

export default function AnnouncementModal({ isOpen, onClose, dict }: AnnouncementModalProps) {
  const { accessToken } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setStatusMsg(null);

    try {
      const payload: any = { subject, message };
      if (gradeId) {
        payload.grade_id = gradeId;
      }

      const res = await fetchWithAuth(`${API_BASE}/api/users/announcement/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (res.ok) {
        setStatusMsg({ type: 'success', text: data.detail || 'Anuncio enviado correctamente.' });
        setTimeout(() => {
          onClose();
          setSubject('');
          setMessage('');
          setGradeId('');
          setStatusMsg(null);
        }, 2000);
      } else {
        setStatusMsg({ type: 'error', text: data.detail || 'Ocurrió un error al enviar.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error de red o de servidor.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Send className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-lg">{dict.sendAnnouncement || 'Enviar Anuncio'}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="p-6 space-y-5">
          {statusMsg && (
            <div className={`p-4 rounded-lg text-sm font-medium ${statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {statusMsg.text}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Destinatarios</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users className="h-5 w-5 text-slate-400" />
              </div>
              <select 
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-white"
              >
                <option value="">Todos los Padres de la Institución</option>
                <option value="1">Padres del 1er Grado (Ejemplo)</option>
                {/* Aquí en el futuro se iteraría sobre los grados reales obtenidos de la API */}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Asunto</label>
            <input 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Suspensión de Clases por Clima"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Mensaje</label>
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Estimados padres, les comunicamos que..."
              rows={5}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSending}
              className="px-5 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {isSending ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Correo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
