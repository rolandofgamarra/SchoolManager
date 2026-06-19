import { useState, useEffect, useMemo } from 'react';
import { Search, GraduationCap, Users, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useDebounce } from '../hooks/useDebounce';
import BoletinViewer from '../components/BoletinViewer';

interface Student {
  id: number;
  nombre: string;
  apellido: string;
  fecha_nac: string;
  grado: number;
  seccion: string;
  grado_detail?: { nombre: string; seccion: string };
}

interface Grado { id: number; nombre: string; seccion: string; }
interface Periodo { id: number; nombre: string; tipo: string; fecha_inicio: string; }

export default function ReportCards() {
  const { accessToken } = useAuthStore();
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [grados, setGrados] = useState<Grado[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedGrado, setSelectedGrado] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  const debouncedSearch = useDebounce(search, 250);

  // Cargar grados y períodos al montar
  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/academics/grades/', { headers }).then(r => r.json()),
      fetchWithAuth('/api/academics/periods/', { headers }).then(r => r.json()),
    ]).then(([g, p]) => {
      const gradosList = g.results ?? g;
      const periodosList = p.results ?? p;
      setGrados(gradosList);
      setPeriodos(periodosList);
      // Preseleccionar el período más reciente
      if (periodosList.length > 0) setSelectedPeriodo(String(periodosList[0].id));
    }).catch(console.error);
  }, []);

  // Cargar alumnos cuando cambia el grado
  useEffect(() => {
    if (!selectedGrado) { setStudents([]); setSelectedStudent(null); return; }
    setLoadingStudents(true);
    setSelectedStudent(null);
    fetchWithAuth(`/api/academics/students/?grado=${selectedGrado}`, { headers })
      .then(r => r.json())
      .then(d => setStudents(d.results ?? d))
      .catch(console.error)
      .finally(() => setLoadingStudents(false));
  }, [selectedGrado]);

  const filteredStudents = useMemo(() =>
    students.filter(s =>
      `${s.nombre} ${s.apellido}`.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [students, debouncedSearch]
  );

  const initials = (s: Student) =>
    `${s.nombre[0] ?? ''}${s.apellido[0] ?? ''}`.toUpperCase();

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-0 bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">

      {/* ── Panel izquierdo: selección ───────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">

        {/* Filtros */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Libretas
          </h2>

          <select
            value={selectedGrado}
            onChange={e => setSelectedGrado(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-indigo-400"
          >
            <option value="">Seleccionar grado…</option>
            {grados.map(g => (
              <option key={g.id} value={g.id}>{g.nombre} — {g.seccion}</option>
            ))}
          </select>

          <select
            value={selectedPeriodo}
            onChange={e => { setSelectedPeriodo(e.target.value); setSelectedStudent(null); }}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-indigo-400"
            disabled={periodos.length === 0}
          >
            <option value="">Seleccionar período…</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          {students.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar alumno…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-400"
              />
            </div>
          )}
        </div>

        {/* Lista de alumnos */}
        <div className="flex-1 overflow-y-auto">
          {!selectedGrado ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-6 text-center">
              <Users className="w-8 h-8 opacity-30" />
              <p className="text-xs">Seleccioná un grado para ver los alumnos</p>
            </div>
          ) : loadingStudents ? (
            <div className="flex items-center justify-center h-24 text-slate-400 text-xs">
              Cargando alumnos…
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-slate-400 text-xs">
              No se encontraron alumnos.
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {filteredStudents.map(s => {
                const isSelected = selectedStudent?.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedStudent(s)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 border-r-2 border-indigo-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {initials(s)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {s.apellido}, {s.nombre}
                        </p>
                        <p className="text-xs text-slate-400">Sección {s.seccion}</p>
                      </div>
                      {isSelected && <ChevronRight className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer con conteo */}
        {filteredStudents.length > 0 && (
          <div className="p-3 border-t border-slate-100 text-xs text-slate-400 text-center">
            {filteredStudents.length} alumno{filteredStudents.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ── Panel derecho: libreta live ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5">
        {!selectedStudent || !selectedPeriodo ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <GraduationCap className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">Seleccioná un alumno y un período</p>
            <p className="text-xs text-center max-w-xs">
              La libreta se genera automáticamente con los datos cargados por los docentes.
            </p>
          </div>
        ) : (
          <BoletinViewer
            key={`${selectedStudent.id}-${selectedPeriodo}`}
            alumnoId={selectedStudent.id}
            periodoId={Number(selectedPeriodo)}
            showDownload
          />
        )}
      </div>
    </div>
  );
}
