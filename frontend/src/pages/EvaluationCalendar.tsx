import { API_BASE } from '../lib/api';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuthStore } from '../store/useAuthStore';

export default function EvaluationCalendar() {
  const { accessToken } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Form states for new evaluation
  const [materias, setMaterias] = useState<any[]>([]);
  const [periodos, setPeriodos] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    materia: localStorage.getItem('calendar_materia') || '',
    periodo: localStorage.getItem('calendar_periodo') || '',
    tipo: localStorage.getItem('calendar_tipo') || 'PROCESO',
    descripcion: '',
    ponderacion: '10'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchEvaluations();
    fetchOptions();
  }, [currentDate]);

  const fetchOptions = async () => {
    if (!accessToken) return;
    try {
      const headers = { 'Authorization': `Bearer ${accessToken}` };
      const [resMaterias, resPeriodos] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/academics/subjects/`, { headers }),
        fetchWithAuth(`${API_BASE}/api/academics/periods/`, { headers })
      ]);
      if (resMaterias.ok) setMaterias((await resMaterias.json()).results || []);
      if (resPeriodos.ok) setPeriodos((await resPeriodos.json()).results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvaluations = async () => {
    setIsLoading(true);
    try {
      // In a real scenario we could filter by month, here we fetch all for the teacher
      const res = await fetchWithAuth(`${API_BASE}/api/academics/evaluations/`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluations(data.results || data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const openModal = (day: Date) => {
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        fecha: format(selectedDate, 'yyyy-MM-dd')
      };

      const res = await fetchWithAuth(`${API_BASE}/api/academics/evaluations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        // Guardamos las preferencias en localStorage
        localStorage.setItem('calendar_materia', formData.materia);
        localStorage.setItem('calendar_periodo', formData.periodo);
        localStorage.setItem('calendar_tipo', formData.tipo);
        
        setFormData(prev => ({
          ...prev, 
          descripcion: '', 
          ponderacion: '10'
        }));
        fetchEvaluations(); // reload
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Calendario de Evaluaciones
          </h1>
          <p className="text-slate-500">Planifica procesos y exámenes haciendo clic en cualquier día libre</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="text-xl font-bold text-slate-800 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 bg-slate-200 gap-[1px]">
          {days.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const dayEvals = evaluations.filter(ev => ev.fecha && isSameDay(parseISO(ev.fecha), day));

            return (
              <div 
                key={i} 
                onClick={() => openModal(day)}
                className={`min-h-[120px] bg-white p-2 transition-colors cursor-pointer group hover:bg-slate-50 ${
                  !isCurrentMonth ? 'text-slate-400 bg-slate-50' : 'text-slate-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                    isSameDay(day, new Date()) ? 'bg-primary text-white' : ''
                  }`}>
                    {format(day, 'd')}
                  </span>
                  <Plus className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="mt-2 space-y-1">
                  {dayEvals.map(ev => (
                    <div 
                      key={ev.id} 
                      className={`text-xs px-2 py-1 rounded truncate border ${
                        ev.tipo === 'EVALUACION' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : ev.tipo === 'SOCIOAFECTIVO'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                      title={`${ev.descripcion} (${ev.ponderacion}%)`}
                    >
                      {ev.descripcion}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Programar Evaluación</h3>
            <p className="text-sm text-slate-500 mb-6">
              Para el {selectedDate && format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
            </p>

            <form onSubmit={handleSaveEvaluation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Materia</label>
                <select 
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2"
                  value={formData.materia}
                  onChange={e => setFormData({...formData, materia: e.target.value})}
                >
                  <option value="">Seleccione Materia</option>
                  {materias.map(m => <option key={m.id} value={m.id}>{m.codigo ? `${m.codigo} - ${m.nombre}` : m.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Periodo</label>
                <select 
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2"
                  value={formData.periodo}
                  onChange={e => setFormData({...formData, periodo: e.target.value})}
                >
                  <option value="">Seleccione Periodo</option>
                  {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <select 
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2"
                  value={formData.tipo}
                  onChange={e => setFormData({...formData, tipo: e.target.value})}
                >
                  <option value="PROCESO">Proceso (70%)</option>
                  <option value="EVALUACION">Evaluación/Valoración (30%)</option>
                  <option value="SOCIOAFECTIVO">Rasgos Socioafectivos (10%)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej: Prueba Sumativa de Fracciones"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2"
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ponderación (%)</label>
                <input 
                  type="number"
                  required
                  min="1"
                  max="100"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2"
                  value={formData.ponderacion}
                  onChange={e => setFormData({...formData, ponderacion: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
