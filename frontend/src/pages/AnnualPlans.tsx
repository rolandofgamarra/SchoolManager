import { API_BASE } from '../lib/api';
import { useEffect, useState, useRef } from 'react';
import { FileText, Upload, Download, Trash2, FileCheck } from 'lucide-react';
import { useLangStore } from '../store/useLangStore';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../locales/translations';

interface AnnualPlan {
  id: number;
  docente_detail: string;
  materia_detail: { id: number; nombre: string; idioma: string } | null;
  año_lectivo: number;
  archivo: string;
  fecha_subida: string;
}

export default function AnnualPlans() {
  const { lang } = useLangStore();
  const { accessToken, user } = useAuthStore();
  const dict = t[lang];
  
  const [plans, setPlans] = useState<AnnualPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [añoLectivo, setAñoLectivo] = useState(new Date().getFullYear());
  const [selectedMateria, setSelectedMateria] = useState('');
  const [activeTab, setActiveTab] = useState<'ANUAL' | 'SEMANAL'>('ANUAL');

  const canUpload = user?.role === 'ADMIN' || user?.role === 'DOCENTE';

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const res = await fetchWithAuth(`${API_BASE}/api/planes-anuales/?tipo=${activeTab}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Django DRF paginates by default or returns an array.
        // Assuming pagination format: { results: [] }
        if (data.results) {
          setPlans(data.results);
        } else {
          setPlans(data);
        }
      }
    } catch (error) {
      console.error("Error fetching annual plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchPlans();
    }
  }, [accessToken, activeTab]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('archivo', fileInputRef.current.files[0]);
    formData.append('año_lectivo', añoLectivo.toString());
    formData.append('tipo', activeTab);
    if (selectedMateria) {
      formData.append('materia', selectedMateria);
    }

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/planes-anuales/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      if (res.ok) {
        // Reset form and refresh list
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchPlans();
      } else {
        console.error("Failed to upload", await res.text());
      }
    } catch (error) {
      console.error("Upload error", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar este plan?")) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/planes-anuales/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (res.ok) {
        fetchPlans();
      }
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Planes Académicos</h1>
          <p className="text-slate-500">Sube y administra tus documentos de planificación</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('ANUAL')}
          className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'ANUAL' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Planes Anuales
        </button>
        <button
          onClick={() => setActiveTab('SEMANAL')}
          className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'SEMANAL' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Planes Semanales
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Formulario de Subida */}
        {canUpload && (
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sticky top-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Upload className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                Subir Plan {activeTab === 'ANUAL' ? 'Anual' : 'Semanal'}
              </h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Selecciona la materia, año lectivo y adjunta el documento en formato PDF, Word o Excel.
            </p>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{dict.academicYear}</label>
                <input 
                  type="number" 
                  value={añoLectivo}
                  onChange={(e) => setAñoLectivo(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{dict.courses || "Materia (Opcional)"}</label>
                <select 
                  value={selectedMateria}
                  onChange={(e) => setSelectedMateria(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
                >
                  <option value="">-- General / Todas --</option>
                  {/* Aquí idealmente cargaríamos las materias del profesor. Por ahora dejamos input manual/opcional */}
                </select>
                <p className="text-xs text-slate-500 mt-1">Si dejas en blanco, aplicará como Plan Global del Docente.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{dict.file}</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx"
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={isUploading}
                className="w-full mt-4 bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isUploading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                {dict.upload}
              </button>
            </form>
          </div>
        </div>
        )}

        {/* Columna Derecha: Listado de Planes */}
        <div className={`space-y-4 ${canUpload ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6">
              Mis Planes {activeTab === 'ANUAL' ? 'Anuales' : 'Semanales'}
            </h2>
            
            {isLoading ? (
              <div className="flex justify-center p-10">
                <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">{dict.noPlans}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="border border-slate-200 rounded-xl p-4 flex flex-col group hover:border-primary/50 hover:shadow-md transition-all bg-slate-50 hover:bg-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-100 text-red-500 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm line-clamp-1" title={plan.archivo.split('/').pop()}>
                            {plan.archivo.split('/').pop()}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {plan.materia_detail ? plan.materia_detail.nombre : 'Plan Global'} • {plan.año_lectivo}
                          </p>
                        </div>
                      </div>
                      {canUpload && (
                      <button 
                        onClick={() => handleDelete(plan.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title={dict.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-xs text-slate-400">
                        {new Date(plan.fecha_subida).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <a 
                        href={plan.archivo} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-sm font-semibold text-primary hover:text-primary-dark flex items-center gap-1 bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        {dict.download}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
