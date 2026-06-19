import { useEffect, useState, useCallback } from 'react';
import {
  Download, RefreshCw,
  BookOpen, Users, Heart, TrendingUp, Loader2,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Nota {
  tipo: string;
  descripcion: string;
  valor: number;
  fecha: string;
  ponderacion: number;
}

interface Materia {
  nombre: string;
  idioma: string;
  notas: Nota[];
  promedio_proceso: number | string;
  promedio_evaluacion: number | string;
  promedio_final: number | string;
  calificacion: string;
}

interface Asistencia {
  total_dias: number;
  presentes: number;
  tardanzas: number;
  ausentes_justificados: number;
  ausentes_injustificados: number;
  porcentaje_asistencia: number;
}

interface RSA {
  dimensiones: Record<string, string>;
  observaciones: string;
}

interface BoletinData {
  alumno: {
    id: number;
    nombre: string;
    apellido: string;
    nombre_completo: string;
    fecha_nac: string;
    grado: string;
    seccion: string;
    ciclo: string;
    idioma_seccion: string;
  };
  periodo: {
    id: number;
    nombre: string;
    fecha_inicio: string;
    fecha_fin: string;
    anio_lectivo: number;
  };
  materias: Materia[];
  asistencia: Asistencia;
  rsa: RSA;
  promedio_general: number | null;
  total_materias: number;
  estado: 'EN_PROGRESO' | 'COMPLETO';
  ultima_actualizacion: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const QUAL_COLORS: Record<string, string> = {
  E:  'bg-emerald-100 text-emerald-800 border-emerald-200',
  MB: 'bg-blue-100 text-blue-800 border-blue-200',
  B:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  A:  'bg-orange-100 text-orange-800 border-orange-200',
  I:  'bg-red-100 text-red-800 border-red-200',
  'A+': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  F:  'bg-red-100 text-red-800 border-red-200',
  '-': 'bg-slate-100 text-slate-500 border-slate-200',
};

const RSA_COLORS: Record<string, string> = {
  MB: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  B:  'bg-blue-100 text-blue-700 border-blue-300',
  R:  'bg-yellow-100 text-yellow-700 border-yellow-300',
  I:  'bg-red-100 text-red-700 border-red-300',
};

const RSA_LABELS: Record<string, string> = {
  convivencia: 'Convivencia',
  participacion: 'Participación',
  responsabilidad: 'Responsabilidad',
  regulacion: 'Regulación',
  trabajo_en_equipo: 'Trabajo en equipo',
};

const asistenciaColor = (pct: number) =>
  pct >= 90 ? 'text-emerald-600' : pct >= 80 ? 'text-amber-600' : 'text-red-600';

const promedioColor = (v: number | string) => {
  if (typeof v !== 'number') return 'text-slate-400';
  if (v >= 9) return 'text-emerald-600';
  if (v >= 7) return 'text-blue-600';
  if (v >= 6) return 'text-amber-600';
  return 'text-red-600';
};

const fmt = (v: number | string) =>
  typeof v === 'number' ? v.toFixed(2) : v;

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  alumnoId: number;
  periodoId: number;
  /** Si es true muestra el botón de descarga PDF */
  showDownload?: boolean;
  /** Callback cuando se descarga */
  onDownload?: () => void;
}

export default function BoletinViewer({ alumnoId, periodoId, showDownload = true }: Props) {
  const { accessToken } = useAuthStore();
  const [data, setData] = useState<BoletinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [expandedMateria, setExpandedMateria] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/boletin/${alumnoId}/${periodoId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar la libreta.');
    } finally {
      setLoading(false);
    }
  }, [alumnoId, periodoId, accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/reports/boletin/${alumnoId}/${periodoId}/pdf/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/pdf')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `libreta_${data?.alumno.apellido}_${data?.alumno.nombre}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('PDF no disponible en este entorno. Mostrando vista previa JSON.');
      }
    } catch {
      alert('Error al descargar el PDF.');
    } finally {
      setDownloading(false);
    }
  };

  // ── Estados de carga / error ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm">Cargando libreta...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <p className="text-sm">{error ?? 'No se encontró información.'}</p>
        <button onClick={load} className="text-indigo-600 text-sm hover:underline flex items-center gap-1">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    );
  }

  const { alumno, periodo, materias, asistencia, rsa, promedio_general, estado } = data;

  return (
    <div className="space-y-5">

      {/* ── Header alumno ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                estado === 'COMPLETO'
                  ? 'bg-emerald-400/20 text-emerald-200'
                  : 'bg-amber-400/20 text-amber-200'
              }`}>
                {estado === 'COMPLETO' ? '✓ Completa' : '⏳ En progreso'}
              </span>
              <span className="text-xs text-white/60">{periodo.nombre}</span>
            </div>
            <h2 className="text-xl font-bold">{alumno.nombre_completo}</h2>
            <p className="text-sm text-white/70 mt-0.5">
              {alumno.grado} — Sección {alumno.seccion} · {alumno.ciclo}
            </p>
            <p className="text-xs text-white/50 mt-0.5">Nacido: {alumno.fecha_nac}</p>
          </div>
          <div className="text-right">
            {promedio_general !== null ? (
              <>
                <p className="text-3xl font-bold">{promedio_general.toFixed(2)}</p>
                <p className="text-xs text-white/60">Promedio general</p>
              </>
            ) : (
              <p className="text-xs text-white/50">Sin notas aún</p>
            )}
          </div>
        </div>

        {/* Barra de acciones */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
          {showDownload && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="ml-auto flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-60"
            >
              {downloading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />}
              Descargar PDF
            </button>
          )}
        </div>
      </div>

      {/* ── Materias ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-slate-800 text-sm">
            Calificaciones — {materias.length} {materias.length === 1 ? 'materia' : 'materias'}
          </h3>
        </div>

        {materias.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">
            No hay notas cargadas para este período todavía.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {materias.map((mat) => {
              const isOpen = expandedMateria === mat.nombre;
              return (
                <div key={mat.nombre}>
                  {/* Fila resumen */}
                  <button
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                    onClick={() => setExpandedMateria(isOpen ? null : mat.nombre)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{mat.nombre}</p>
                      <p className="text-xs text-slate-400">{mat.notas.length} registro{mat.notas.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400">Procesos</p>
                        <p className={`text-sm font-medium ${promedioColor(mat.promedio_proceso)}`}>
                          {fmt(mat.promedio_proceso)}
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400">Evaluación</p>
                        <p className={`text-sm font-medium ${promedioColor(mat.promedio_evaluacion)}`}>
                          {fmt(mat.promedio_evaluacion)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Final</p>
                        <p className={`text-sm font-bold ${promedioColor(mat.promedio_final)}`}>
                          {fmt(mat.promedio_final)}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${QUAL_COLORS[mat.calificacion] ?? QUAL_COLORS['-']}`}>
                        {mat.calificacion}
                      </span>
                      <span className="text-slate-300 text-xs">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Detalle de notas expandible */}
                  {isOpen && mat.notas.length > 0 && (
                    <div className="px-5 pb-4 bg-slate-50/60">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-200">
                            <th className="text-left py-1.5 font-medium">Descripción</th>
                            <th className="text-center py-1.5 font-medium w-24">Tipo</th>
                            <th className="text-center py-1.5 font-medium w-16">Nota</th>
                            <th className="text-right py-1.5 font-medium w-24">Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mat.notas.map((n, i) => (
                            <tr key={i} className="border-b border-slate-100 last:border-0">
                              <td className="py-1.5 text-slate-700">{n.descripcion}</td>
                              <td className="py-1.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  n.tipo === 'PROCESO'
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : 'bg-purple-50 text-purple-600'
                                }`}>
                                  {n.tipo === 'PROCESO' ? `Proceso ${n.ponderacion}%` : `Evaluación ${n.ponderacion}%`}
                                </span>
                              </td>
                              <td className={`py-1.5 text-center font-bold ${promedioColor(n.valor)}`}>
                                {n.valor.toFixed(2)}
                              </td>
                              <td className="py-1.5 text-right text-slate-400">{n.fecha}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Asistencia ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Asistencia</h3>
          <span className={`ml-auto text-lg font-bold ${asistenciaColor(asistencia.porcentaje_asistencia)}`}>
            {asistencia.porcentaje_asistencia}%
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total días', value: asistencia.total_dias, color: 'text-slate-700' },
            { label: 'Presentes', value: asistencia.presentes, color: 'text-emerald-600' },
            { label: 'Tardanzas', value: asistencia.tardanzas, color: 'text-amber-600' },
            { label: 'Aus. justif.', value: asistencia.ausentes_justificados, color: 'text-blue-600' },
            { label: 'Aus. injustif.', value: asistencia.ausentes_injustificados, color: 'text-red-600' },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
        {/* Barra de progreso */}
        <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              asistencia.porcentaje_asistencia >= 90
                ? 'bg-emerald-500'
                : asistencia.porcentaje_asistencia >= 80
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${asistencia.porcentaje_asistencia}%` }}
          />
        </div>
      </div>

      {/* ── RSA ────────────────────────────────────────────────────────────── */}
      {Object.keys(rsa.dimensiones).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-pink-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Rasgos Socioafectivos</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(rsa.dimensiones).map(([dim, val]) => (
              <div key={dim} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${RSA_COLORS[val] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <span className="font-medium">{RSA_LABELS[dim] ?? dim}</span>
                <span className="font-bold">{val}</span>
              </div>
            ))}
          </div>
          {rsa.observaciones && (
            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-800">
              <span className="font-medium">Observaciones: </span>
              {rsa.observaciones}
            </div>
          )}
        </div>
      )}

      {/* ── Escalas ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Escala de calificaciones</h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { k: 'E',  label: 'Excelente ≥ 9.0',    es: true },
            { k: 'MB', label: 'Muy Bien ≥ 8.0',      es: true },
            { k: 'B',  label: 'Bien ≥ 7.0',          es: true },
            { k: 'A',  label: 'Aprendiendo ≥ 6.0',   es: true },
            { k: 'I',  label: 'Insuficiente < 6.0',  es: true },
          ].map((item) => (
            <span key={item.k} className={`px-2.5 py-1 rounded-lg border font-medium ${QUAL_COLORS[item.k]}`}>
              {item.k} — {item.label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs mt-2">
          {[
            { k: 'MB', label: 'Muy Bien' },
            { k: 'B',  label: 'Bien' },
            { k: 'R',  label: 'Regular' },
            { k: 'I',  label: 'Insuficiente' },
          ].map((item) => (
            <span key={item.k} className={`px-2.5 py-1 rounded-lg border font-medium ${RSA_COLORS[item.k]}`}>
              RSA {item.k} — {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
