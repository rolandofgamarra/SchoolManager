import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, BarChart2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import StudentRadarChart from '../analytics/StudentRadarChart';
import AttendanceHeatmap from '../analytics/AttendanceHeatmap';
import BoletinViewer from '../components/BoletinViewer';

interface Periodo { id: number; nombre: string; fecha_inicio: string; }

type Tab = 'libreta' | 'analytics';

export default function StudentProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const [student, setStudent] = useState<any>(null);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [tab, setTab] = useState<Tab>('libreta');

  useEffect(() => {
    if (!accessToken || !id) return;
    const h = { Authorization: `Bearer ${accessToken}` };

    fetchWithAuth(`/api/academics/students/${id}/`, { headers: h })
      .then(r => r.json())
      .then(setStudent)
      .catch(console.error);

    fetchWithAuth('/api/academics/periods/', { headers: h })
      .then(r => r.json())
      .then(d => {
        const list: Periodo[] = d.results ?? d;
        setPeriodos(list);
        if (list.length > 0) setSelectedPeriodo(String(list[0].id));
      })
      .catch(console.error);
  }, [accessToken, id]);

  if (!student) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Cargando...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Navegación superior ──────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/parent')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al Portal
      </button>

      {/* ── Header alumno ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {student.nombre} {student.apellido}
            </h1>
            <p className="text-sm text-slate-500">
              {student.grado_detail?.nombre ?? 'Sin grado asignado'} — Sección {student.seccion ?? '-'}
            </p>
          </div>

          {/* Selector de período */}
          <select
            value={selectedPeriodo}
            onChange={e => setSelectedPeriodo(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-indigo-400"
          >
            <option value="">Período…</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-t border-slate-100 pt-4">
          <button
            onClick={() => setTab('libreta')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === 'libreta'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Libreta
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === 'analytics'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Analíticas
          </button>
        </div>
      </div>

      {/* ── Contenido de tab ─────────────────────────────────────────────── */}
      {tab === 'libreta' ? (
        selectedPeriodo ? (
          <BoletinViewer
            key={`${id}-${selectedPeriodo}`}
            alumnoId={Number(id)}
            periodoId={Number(selectedPeriodo)}
            showDownload
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-sm">
            Seleccioná un período para ver la libreta.
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Perfil Académico</h3>
            <StudentRadarChart />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Historial de Asistencia</h3>
            <AttendanceHeatmap />
          </div>
        </div>
      )}
    </div>
  );
}
