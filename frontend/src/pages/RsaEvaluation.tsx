import { API_BASE } from '../lib/api';
import { useState, useEffect } from 'react';
import { HeartHandshake, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

// Indicadores según RSA.md
const RESPONSABILIDAD = [
  { id: 'tareas', label: 'Entrega tareas y trabajos en los plazos establecidos' },
  { id: 'asistencia', label: 'Asiste con regularidad y llega puntual a clase' },
  { id: 'materiales', label: 'Porta y cuida los materiales y útiles necesarios' },
  { id: 'compromisos', label: 'Cumple los compromisos asumidos (turnos, roles)' },
  { id: 'autonomia', label: 'Actúa con autonomía e iniciativa sin supervisión constante' },
  { id: 'errores', label: 'Reconoce errores u omisiones y los corrige sin sanción' },
];

const CONDUCTA = [
  { id: 'normas', label: 'Respeta las normas de convivencia del aula y de la institución' },
  { id: 'respeto', label: 'Mantiene un trato respetuoso hacia compañeros y personal' },
  { id: 'constructiva', label: 'Participa de manera constructiva, sin interrumpir' },
  { id: 'pacifica', label: 'Resuelve diferencias de forma pacífica y dialogada' },
  { id: 'espacio', label: 'Cuida el espacio físico y los bienes comunes' },
  { id: 'colabora', label: 'Colabora activamente en trabajos grupales' },
  { id: 'autocontrol', label: 'Muestra autocontrol ante situaciones de frustración' },
];

export default function RsaEvaluation() {
  const { accessToken } = useAuthStore();
  const [students, setStudents] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [respScores, setRespScores] = useState<Record<string, number>>({});
  const [condScores, setCondScores] = useState<Record<string, number>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${accessToken}` };
      const [resSt, resPe] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/academics/students/`, { headers }),
        fetchWithAuth(`${API_BASE}/api/academics/periods/`, { headers })
      ]);
      const stData = await resSt.json();
      const peData = await resPe.json();
      setStudents(stData.results || stData);
      setPeriods(peData.results || peData);
    } catch (err) {
      console.error("Error fetching dependencies", err);
    }
  };

  const handleRespScore = (id: string, val: number) => setRespScores(p => ({ ...p, [id]: val }));
  const handleCondScore = (id: string, val: number) => setCondScores(p => ({ ...p, [id]: val }));

  // Cálculo: Promedio de 1-4 transformado a escala de 10
  const calcAverage = (scoresObj: Record<string, number>, totalItems: number) => {
    const values = Object.values(scoresObj);
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg4 = sum / totalItems; // 1 to 4 scale
    // Transform 1-4 scale to 1-10 scale:
    // formula simple: (avg4 / 4) * 10 
    return (avg4 / 4) * 10;
  };

  const respNota = calcAverage(respScores, RESPONSABILIDAD.length);
  const condNota = calcAverage(condScores, CONDUCTA.length);
  
  // Ambas pesan 50/50
  const finalScore = (respNota + condNota) / 2;

  const getLogroText = (score: number) => {
    if (score >= 9) return { text: "Excelente", color: "text-green-600 bg-green-100" };
    if (score >= 7) return { text: "Muy Bueno", color: "text-blue-600 bg-blue-100" };
    if (score >= 5) return { text: "Bueno", color: "text-amber-600 bg-amber-100" };
    if (score > 0) return { text: "A Mejorar", color: "text-red-600 bg-red-100" };
    return { text: "No evaluado", color: "text-slate-500 bg-slate-100" };
  };

  const logroInfo = getLogroText(finalScore);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedPeriod) {
      alert("Debes seleccionar un alumno y un periodo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        alumno: selectedStudent,
        periodo: selectedPeriod,
        dimensiones: {
          responsabilidad: respScores,
          conducta: condScores,
          puntaje_final: finalScore
        },
        observaciones: observaciones
      };

      const res = await fetchWithAuth(`${API_BASE}/api/academics/affective/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg('Evaluación guardada exitosamente.');
        setRespScores({});
        setCondScores({});
        setObservaciones('');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        const errorData = await res.json();
        alert('Error al guardar: ' + JSON.stringify(errorData));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderIndicatorRow = (ind: any, currentVal: number, onChange: (val: number) => void) => (
    <div key={ind.id} className="flex flex-col md:flex-row md:items-center justify-between py-3 border-b border-slate-50 gap-4 hover:bg-slate-50/50 px-2 rounded transition-colors">
      <span className="text-sm text-slate-700 flex-1">{ind.label}</span>
      <div className="flex gap-2">
        {[
          { v: 1, l: 'Rara vez' },
          { v: 2, l: 'Ocasional' },
          { v: 3, l: 'Frecuente' },
          { v: 4, l: 'Siempre' }
        ].map(opt => (
          <button
            type="button"
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all border
              ${currentVal === opt.v 
                ? 'bg-primary text-white border-primary shadow-sm scale-105' 
                : 'bg-white text-slate-500 border-slate-200 hover:border-primary/50 hover:bg-primary/5'}`}
          >
            {opt.v} - {opt.l}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <HeartHandshake className="w-8 h-8 text-primary" />
            Evaluación Socioafectiva (RSA)
          </h1>
          <p className="text-slate-500 mt-2 ml-11">
            Rúbrica de seguimiento de Responsabilidad y Conducta. Representa el 10% de la nota final.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 text-green-700 border border-green-200 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Selección Principal */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Alumno a Evaluar</label>
            <select 
              value={selectedStudent} 
              onChange={e => setSelectedStudent(e.target.value)}
              required
              className="w-full border-slate-200 rounded-lg shadow-sm focus:border-primary focus:ring-primary/20"
            >
              <option value="">-- Seleccionar Alumno --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.apellido}, {s.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Periodo Lectivo</label>
            <select 
              value={selectedPeriod} 
              onChange={e => setSelectedPeriod(e.target.value)}
              required
              className="w-full border-slate-200 rounded-lg shadow-sm focus:border-primary focus:ring-primary/20"
            >
              <option value="">-- Seleccionar Periodo --</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Columna Izquierda: Rúbricas (Ocupa 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Rasgo 1 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">1. Responsabilidad (50%)</h2>
                <span className="ml-auto bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-lg text-sm">
                  {respNota.toFixed(1)} / 10
                </span>
              </div>
              <div className="space-y-1">
                {RESPONSABILIDAD.map(ind => renderIndicatorRow(ind, respScores[ind.id], (v) => handleRespScore(ind.id, v)))}
              </div>
            </div>

            {/* Rasgo 2 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-bold text-slate-800">2. Aporte a la Conducta (50%)</h2>
                <span className="ml-auto bg-orange-50 text-orange-700 font-bold px-3 py-1 rounded-lg text-sm">
                  {condNota.toFixed(1)} / 10
                </span>
              </div>
              <div className="space-y-1">
                {CONDUCTA.map(ind => renderIndicatorRow(ind, condScores[ind.id], (v) => handleCondScore(ind.id, v)))}
              </div>
            </div>

            {/* Observaciones */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-sm font-bold text-slate-800 mb-3">Observaciones Adicionales (Opcional)</h2>
              <textarea 
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Anota cualquier evento o justificación relevante de esta evaluación..."
                className="w-full border-slate-200 rounded-lg shadow-sm focus:border-primary focus:ring-primary/20 text-sm"
              />
            </div>
          </div>

          {/* Columna Derecha: Calculadora y Submit */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-primary-dark to-primary rounded-xl shadow-lg p-6 text-white sticky top-6">
              <h3 className="text-white/80 font-medium uppercase tracking-wider text-xs mb-6">Resultado de Evaluación</h3>
              
              <div className="flex justify-center items-center mb-6">
                <div className="w-32 h-32 rounded-full border-4 border-white/20 flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm">
                  <span className="text-4xl font-black">{finalScore.toFixed(1)}</span>
                  <span className="text-xs text-white/60 mt-1">sobre 10</span>
                </div>
              </div>

              <div className="text-center mb-8">
                <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${logroInfo.color}`}>
                  {logroInfo.text}
                </span>
              </div>

              <div className="space-y-4 text-sm text-white/80 mb-8 border-t border-white/10 pt-6">
                <div className="flex justify-between">
                  <span>Respuestas:</span>
                  <span className="font-bold text-white">
                    {Object.keys(respScores).length + Object.keys(condScores).length} / 13
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Impacto Libreta (10%):</span>
                  <span className="font-bold text-green-300">
                    +{(finalScore * 0.1).toFixed(2)} pts
                  </span>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white text-primary font-bold py-3.5 px-4 rounded-xl shadow-md hover:bg-slate-50 hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Guardar Evaluación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
