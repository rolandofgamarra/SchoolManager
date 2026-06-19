import { API_BASE } from '../lib/api';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLangStore } from '../store/useLangStore';
import { useAuthStore } from '../store/useAuthStore';

// We map raw data from the Pandas backend to the Recharts format
// Expected pandas output from backend: [{"materia__nombre": "Matemáticas", "promedio": 8.5, ...}]

interface BackendStat {
  materia__nombre: string;
  promedio: number;
}

const mockData = [
  { subject: 'Math', es: 'Matemáticas', score: 8.5 },
  { subject: 'Science', es: 'Ciencias', score: 7.8 },
  { subject: 'History', es: 'Historia', score: 9.1 },
  { subject: 'Literature', es: 'Literatura', score: 8.2 },
  { subject: 'Art', es: 'Arte', score: 9.5 }
];

export default function GradePerformanceChart() {
  const { lang } = useLangStore();
  const { accessToken } = useAuthStore();
  const [data, setData] = useState<{name: string, score: number}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        // Using Grado 1, Periodo 1 as the default for the dashboard
        const res = await fetchWithAuth(`${API_BASE}/api/analytics/grades/1/periods/1/`, { headers });
        
        if (res.ok) {
          const backendData: BackendStat[] = await res.json();
          if (backendData && backendData.length > 0) {
            setData(backendData.map(d => ({
              name: d.materia__nombre,
              score: Number(d.promedio)
            })));
            return;
          }
        }
        
        // Fallback to mock data if backend has no data or fails
        const fallback = mockData.map(d => ({
          name: lang === 'es' ? d.es : d.subject,
          score: d.score
        }));
        setData(fallback);

      } catch (error) {
        console.error("Failed to fetch analytics", error);
        // Fallback
        setData(mockData.map(d => ({
          name: lang === 'es' ? d.es : d.subject,
          score: d.score
        })));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [accessToken, lang]);

  if (isLoading) {
    return (
      <div className="h-72 w-full flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm text-slate-500 font-medium">Cargando analíticas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }}
            domain={[0, 10]}
          />
          <Tooltip 
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
