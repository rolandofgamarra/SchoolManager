import { API_BASE } from '../lib/api';
import { useState, useEffect } from 'react';
import { BarChart2, AlertTriangle, FileX, Users } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import GradePerformanceChart from '../analytics/GradePerformanceChart';

export default function Analytics() {
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'general' | 'atRisk' | 'missing'>('general');
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [missingAssignments, setMissingAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'atRisk') {
      fetchAtRisk();
    } else if (activeTab === 'missing') {
      fetchMissing();
    }
  }, [activeTab]);

  const fetchAtRisk = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/api/analytics/at-risk/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await res.json();
      setAtRiskStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMissing = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/api/analytics/missing-assignments/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await res.json();
      setMissingAssignments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <BarChart2 className="w-8 h-8 text-primary" />
          Analíticas y Reportes
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium text-sm transition-colors ${activeTab === 'general' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('general')}
          >
            <BarChart2 className="w-4 h-4" />
            Rendimiento General
          </button>
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium text-sm transition-colors ${activeTab === 'atRisk' ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('atRisk')}
          >
            <AlertTriangle className="w-4 h-4" />
            Riesgo Académico (&lt; 70%)
          </button>
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium text-sm transition-colors ${activeTab === 'missing' ? 'text-red-600 border-b-2 border-red-500 bg-red-50' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('missing')}
          >
            <FileX className="w-4 h-4" />
            Tareas Pendientes
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-lg font-bold text-slate-800">Rendimiento por Grado y Materia</h2>
              <GradePerformanceChart />
            </div>
          )}

          {activeTab === 'atRisk' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-lg font-bold text-slate-800 text-orange-700">Alumnos por debajo del 70%</h2>
              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Cargando datos...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-100">
                        <th className="py-3 px-4 font-semibold text-slate-600 text-sm">Alumno</th>
                        <th className="py-3 px-4 font-semibold text-slate-600 text-sm">Grado</th>
                        <th className="py-3 px-4 font-semibold text-slate-600 text-sm text-right">Promedio General</th>
                        <th className="py-3 px-4 font-semibold text-slate-600 text-sm">Acción Sugerida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atRiskStudents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500">No hay alumnos en riesgo académico en este periodo.</td>
                        </tr>
                      ) : (
                        atRiskStudents.map((s, idx) => (
                          <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-medium text-slate-800">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                {s.alumno__apellido}, {s.alumno__nombre}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 text-sm">{s.alumno__grado__nombre || 'N/A'}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-sm font-bold bg-orange-100 text-orange-700">
                                {s.promedio.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button className="text-xs font-semibold text-primary hover:text-primary-dark underline">Agendar Tutoría</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'missing' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-lg font-bold text-slate-800 text-red-700">Consignas y Tareas Sin Entregar</h2>
              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Cargando datos...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-100">
                        <th className="py-3 px-4 font-semibold text-slate-600 text-sm">Alumno</th>
                        <th className="py-3 px-4 font-semibold text-slate-600 text-sm">Materia</th>
                        <th className="py-3 px-4 font-semibold text-slate-600 text-sm">Consigna Pendiente</th>
                        <th className="py-3 px-4 font-semibold text-slate-600 text-sm">Aviso a Padres</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingAssignments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500">Todos los alumnos están al día con sus consignas.</td>
                        </tr>
                      ) : (
                        missingAssignments.map((m, idx) => (
                          <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-medium text-slate-800">
                              {m.alumno__apellido}, {m.alumno__nombre}
                            </td>
                            <td className="py-3 px-4 text-slate-600 text-sm">
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">
                                {m.evaluacion__materia__nombre}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-red-600 text-sm">
                              {m.evaluacion__descripcion}
                            </td>
                            <td className="py-3 px-4">
                              <button className="text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded transition-colors">
                                Enviar Recordatorio
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
