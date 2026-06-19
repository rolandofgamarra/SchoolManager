import { API_BASE, fetchWithAuth } from '../lib/api';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { useLangStore } from '../store/useLangStore';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../locales/translations';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function ParentDashboard() {
  const { lang } = useLangStore();
  const { accessToken } = useAuthStore();
  const dict = t[lang];
  const navigate = useNavigate();

  const [childrenData, setChildrenData] = useState<any[]>([]);
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/academics/students/`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          // El API restringe los estudiantes a los hijos de este padre
          setChildrenData(data.results || data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (accessToken) fetchChildren();
  }, [accessToken]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{dict.welcomeParent}</h1>
          <p className="text-slate-500">{dict.childrenProgress}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {childrenData.map((child) => (
          <div key={child.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{child.nombre} {child.apellido}</h2>
                  <p className="text-sm text-slate-500">{child.grado_detail?.nombre || 'General'}</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 my-6">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs text-slate-500 font-medium mb-1">{dict.averageScore}</p>
                <p className="text-xl font-bold text-slate-800">--</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs text-slate-500 font-medium mb-1">{dict.attendanceRate}</p>
                <p className="text-xl font-bold text-slate-800">--</p>
              </div>
            </div>

            <button 
              onClick={() => navigate(`/parent/student/${child.id}`)}
              className="mt-auto w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {dict.viewDetails}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
