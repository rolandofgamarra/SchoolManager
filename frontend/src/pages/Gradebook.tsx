import { API_BASE } from '../lib/api';
import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function Gradebook() {
  const { accessToken } = useAuthStore();
  const [grados, setGrados] = useState<any[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [periodos, setPeriodos] = useState<any[]>([]);
  
  const [selectedGrado, setSelectedGrado] = useState(() => localStorage.getItem('gradebook_grado') || '');
  const [selectedMateria, setSelectedMateria] = useState(() => localStorage.getItem('gradebook_materia') || '');
  const [selectedPeriodo, setSelectedPeriodo] = useState(() => localStorage.getItem('gradebook_periodo') || '');

  const [students, setStudents] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, Record<string, any>>>({}); 
  
  const [isLoading, setIsLoading] = useState(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Matriz de referencias para navegación tipo Excel
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  useEffect(() => {
    // Fetch initial options
    const fetchOptions = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${accessToken}` };
        const [resGrados, resMaterias, resPeriodos] = await Promise.all([
          fetch(`${API_BASE}/api/academics/grades/`, { headers }),
          fetch(`${API_BASE}/api/academics/subjects/`, { headers }),
          fetch(`${API_BASE}/api/academics/periods/`, { headers })
        ]);
        
        if (resGrados.ok) setGrados((await resGrados.json()).results || []);
        if (resMaterias.ok) setMaterias((await resMaterias.json()).results || []);
        if (resPeriodos.ok) setPeriodos((await resPeriodos.json()).results || []);
      } catch (err) {
        console.error(err);
      }
    };
    if (accessToken) fetchOptions();
  }, [accessToken]);

  useEffect(() => {
    localStorage.setItem('gradebook_grado', selectedGrado);
    localStorage.setItem('gradebook_materia', selectedMateria);
    localStorage.setItem('gradebook_periodo', selectedPeriodo);

    if (selectedGrado && selectedMateria && selectedPeriodo) {
      loadGrid();
    } else {
      setStudents([]);
      setEvaluations([]);
    }
  }, [selectedGrado, selectedMateria, selectedPeriodo]);

  const loadGrid = async () => {
    setIsLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${accessToken}` };
      
      const resStudents = await fetch(`${API_BASE}/api/academics/students/?grado=${selectedGrado}`, { headers });
      const studentsData = await resStudents.json();
      const studentsList = studentsData.results || studentsData;
      setStudents(studentsList);

      const resEvals = await fetch(`${API_BASE}/api/academics/evaluations/?materia=${selectedMateria}&periodo=${selectedPeriodo}`, { headers });
      const evalsData = await resEvals.json();
      const evalsList = evalsData.results || evalsData;
      setEvaluations(evalsList);

      // Re-inicializar la matriz de referencias
      inputRefs.current = Array(studentsList.length).fill(null).map(() => Array(evalsList.length).fill(null));

      // Fetch Notes filtradas por materia y periodo directamente desde el backend
      const resNotes = await fetch(`${API_BASE}/api/academics/notes/?evaluacion__materia=${selectedMateria}&evaluacion__periodo=${selectedPeriodo}`, { headers });
      const notesData = await resNotes.json();
      const allNotes = notesData.results || notesData;

      const newNotesObj: Record<string, Record<string, any>> = {};
      allNotes.forEach((n: any) => {
        if (!newNotesObj[n.alumno]) newNotesObj[n.alumno] = {};
        newNotesObj[n.alumno][n.evaluacion] = n;
      });
      setNotes(newNotesObj);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellBlur = async (studentId: string, evalId: string, newValue: string) => {
    const existingNote = notes[studentId]?.[evalId];
    if (existingNote?.valor == newValue) return; // No change
    if (!newValue && !existingNote) return; // Still empty

    const cellKey = `${studentId}-${evalId}`;
    setSavingCell(cellKey);

    try {
      const payload = {
        alumno: studentId,
        evaluacion: evalId,
        valor: parseFloat(newValue) || 0
      };

      let url = `${API_BASE}/api/academics/notes/`;
      let method = 'POST';

      if (existingNote?.id) {
        url += `${existingNote.id}/`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedNote = await res.json();
        setNotes(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [evalId]: savedNote
          }
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, sIdx: number, eIdx: number) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      let nextSIdx = sIdx;
      let nextEIdx = eIdx;

      if (e.key === 'ArrowUp') nextSIdx = Math.max(0, sIdx - 1);
      if (e.key === 'ArrowDown') nextSIdx = Math.min(students.length - 1, sIdx + 1);
      if (e.key === 'ArrowLeft') nextEIdx = Math.max(0, eIdx - 1);
      if (e.key === 'ArrowRight') nextEIdx = Math.min(evaluations.length - 1, eIdx + 1);

      const nextInput = inputRefs.current[nextSIdx]?.[nextEIdx];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Libro de Calificaciones (Planilla)</h1>
          <p className="text-slate-500">Carga rápida de procesos, evaluaciones y RSA</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4">
        <select 
          className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-4 py-2"
          value={selectedGrado}
          onChange={e => setSelectedGrado(e.target.value)}
        >
          <option value="">Seleccione Clase/Grado</option>
          {grados.map(g => <option key={g.id} value={g.id}>{g.codigo ? `${g.codigo} - ${g.nombre}` : g.nombre}</option>)}
        </select>

        <select 
          className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-4 py-2"
          value={selectedMateria}
          onChange={e => setSelectedMateria(e.target.value)}
        >
          <option value="">Seleccione Materia</option>
          {materias.map(m => <option key={m.id} value={m.id}>{m.codigo ? `${m.codigo} - ${m.nombre}` : m.nombre}</option>)}
        </select>

        <select 
          className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-4 py-2"
          value={selectedPeriodo}
          onChange={e => setSelectedPeriodo(e.target.value)}
        >
          <option value="">Seleccione Periodo</option>
          {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        selectedGrado && selectedMateria && selectedPeriodo && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
            {evaluations.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No hay evaluaciones programadas para esta combinación.</p>
                <p className="text-sm mt-2">Crea evaluaciones desde el Calendario o el módulo de Evaluaciones.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 w-64 border-r border-slate-200">
                      Alumno
                    </th>
                    {evaluations.map(ev => (
                      <th key={ev.id} className="p-4 text-center border-r border-slate-200">
                        <div className="text-sm font-bold text-slate-800 truncate w-32" title={ev.descripcion}>
                          {ev.descripcion}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {ev.tipo} • {ev.ponderacion}%
                        </div>
                      </th>
                    ))}
                    <th className="p-4 font-bold text-slate-700 text-center">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, sIdx) => {
                    // Calculate basic average
                    let totalPonderado = 0;
                    evaluations.forEach(ev => {
                      const val = parseFloat(notes[student.id]?.[ev.id]?.valor || 0);
                      totalPonderado += val * (parseFloat(ev.ponderacion) / 100);
                    });

                    return (
                      <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-4 font-medium text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-200">
                          {student.nombre} {student.apellido}
                        </td>
                        {evaluations.map((ev, eIdx) => {
                          const existingNote = notes[student.id]?.[ev.id];
                          const cellKey = `${student.id}-${ev.id}`;
                          const isSaving = savingCell === cellKey;
                          
                          // Si se guardó exitosamente recientemente (feedback visual sutil)
                          const isSuccess = !isSaving && existingNote;

                          return (
                            <td key={ev.id} className="p-1 border-r border-slate-100 relative">
                              <input 
                                ref={(el) => {
                                  if (inputRefs.current[sIdx]) {
                                    inputRefs.current[sIdx][eIdx] = el;
                                  }
                                }}
                                type="number"
                                className={`w-full h-11 text-center bg-transparent border-2 border-transparent hover:border-slate-200 focus:border-primary focus:bg-primary/5 rounded-md transition-all outline-none font-medium text-slate-700
                                  ${isSuccess ? 'bg-emerald-50/30' : ''}`}
                                defaultValue={existingNote?.valor || ''}
                                onBlur={(e) => handleCellBlur(student.id, ev.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, sIdx, eIdx)}
                                placeholder="-"
                                step="0.1"
                                min="0"
                                max="100"
                              />
                              {isSaving && (
                                <div className="absolute top-1/2 right-2 -translate-y-1/2">
                                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-4 text-center font-bold text-slate-800 bg-slate-50/50">
                          {totalPonderado.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )
      )}
    </div>
  );
}
