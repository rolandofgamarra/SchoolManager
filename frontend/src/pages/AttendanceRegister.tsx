import { API_BASE } from '../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle, Save, Loader2, CalendarDays, Users } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

type EstadoKey = 'PRESENTE' | 'AUSENTE_JUSTIFICADO' | 'AUSENTE_INJUSTIFICADO' | 'TARDANZA';

interface Student {
  id: number;
  nombre: string;
  apellido: string;
}

interface AttendanceRecord {
  alumno: number;
  estado: EstadoKey;
  justificacion: string;
}

const ESTADOS: { key: EstadoKey; label: string; icon: any; color: string; bg: string }[] = [
  { key: 'PRESENTE',              label: 'Presente',     icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 ring-emerald-300' },
  { key: 'TARDANZA',              label: 'Tardanza',     icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200 ring-amber-300' },
  { key: 'AUSENTE_JUSTIFICADO',   label: 'Aus. Just.',   icon: AlertCircle,  color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200 ring-blue-300' },
  { key: 'AUSENTE_INJUSTIFICADO', label: 'Aus. Injust.', icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50 border-red-200 ring-red-300' },
];

export default function AttendanceRegister() {
  const { accessToken } = useAuthStore();
  const [grados, setGrados] = useState<any[]>([]);
  const [selectedGrado, setSelectedGrado] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<number, AttendanceRecord>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!accessToken) return;
    fetchWithAuth(`${API_BASE}/api/academics/grades/`, { headers })
      .then(r => r.json())
      .then(d => setGrados(d.results || d))
      .catch(console.error);
  }, [accessToken]);

  const loadStudents = useCallback(async () => {
    if (!selectedGrado) return;
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/academics/students/?grado=${selectedGrado}`, { headers });
      const data = await res.json();
      const list: Student[] = data.results || data;
      setStudents(list);
      // Initialize all as PRESENTE
      const init: Record<number, AttendanceRecord> = {};
      list.forEach(s => {
        init[s.id] = { alumno: s.id, estado: 'PRESENTE', justificacion: '' };
      });
      setRecords(init);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGrado, accessToken]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const setEstado = (alumnoId: number, estado: EstadoKey) => {
    setRecords(prev => ({ ...prev, [alumnoId]: { ...prev[alumnoId], estado } }));
  };

  const setJustificacion = (alumnoId: number, justificacion: string) => {
    setRecords(prev => ({ ...prev, [alumnoId]: { ...prev[alumnoId], justificacion } }));
  };

  const markAll = (estado: EstadoKey) => {
    setRecords(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => { next[Number(id)] = { ...next[Number(id)], estado }; });
      return next;
    });
  };

  const handleSave = async () => {
    if (!fecha || students.length === 0) return;
    setIsSaving(true);
    setSavedOk(false);
    try {
      const payload = {
        fecha,
        records: Object.values(records),
      };
      const res = await fetchWithAuth(`${API_BASE}/api/academics/attendance/batch/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const counts = Object.values(records).reduce(
    (acc, r) => { acc[r.estado] = (acc[r.estado] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Registro de Asistencia
          </h1>
          <p className="text-slate-500 text-sm mt-1">Toma de asistencia diaria por clase</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || students.length === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm
            ${savedOk
              ? 'bg-emerald-500 text-white'
              : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedOk ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Guardando…' : savedOk ? '¡Guardado!' : 'Guardar Asistencia'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Clase / Grado</label>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 text-sm"
            value={selectedGrado}
            onChange={e => setSelectedGrado(e.target.value)}
          >
            <option value="">Seleccione un grado…</option>
            {grados.map(g => (
              <option key={g.id} value={g.id}>
                {g.codigo ? `${g.codigo} – ${g.nombre}` : g.nombre} ({g.seccion})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Fecha</label>
          <input
            type="date"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 text-sm"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
          />
        </div>
      </div>

      {/* Summary bar + mark all */}
      {students.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">{students.length}</span> alumnos
          </div>
          <div className="flex gap-2 ml-auto flex-wrap">
            {ESTADOS.map(e => (
              <span key={e.key} className={`text-xs font-semibold px-2 py-1 rounded-full border ${e.bg} ${e.color}`}>
                {counts[e.key] || 0} {e.label}
              </span>
            ))}
          </div>
          <div className="border-l border-slate-200 pl-4 flex gap-2">
            <span className="text-xs text-slate-500 self-center">Marcar todos:</span>
            {ESTADOS.map(e => (
              <button
                key={e.key}
                onClick={() => markAll(e.key)}
                className={`text-xs font-semibold px-2 py-1 rounded-lg border transition-all ${e.bg} ${e.color} hover:ring-2 ring-offset-1`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Student list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : !selectedGrado ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-16 text-center text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="font-medium">Seleccione un grado para comenzar</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-16 text-center text-slate-400">
          <p>No hay alumnos en este grado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Alumno</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Estado</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Justificación</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => {
                const rec = records[student.id];
                const activeEstado = rec?.estado || 'PRESENTE';
                const needsJustification = activeEstado === 'AUSENTE_JUSTIFICADO';

                return (
                  <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-slate-400 text-sm">{idx + 1}</td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-slate-800">{student.apellido},</span>{' '}
                      <span className="text-slate-600">{student.nombre}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 justify-center">
                        {ESTADOS.map(e => {
                          const isActive = activeEstado === e.key;
                          const Icon = e.icon;
                          return (
                            <button
                              key={e.key}
                              onClick={() => setEstado(student.id, e.key)}
                              title={e.label}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all
                                ${isActive
                                  ? `${e.bg} ${e.color} ring-2 ring-offset-1 shadow-sm`
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{e.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        placeholder={needsJustification ? 'Motivo de ausencia…' : '—'}
                        disabled={!needsJustification}
                        value={rec?.justificacion || ''}
                        onChange={e => setJustificacion(student.id, e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:border-primary"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
