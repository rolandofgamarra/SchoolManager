import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useLangStore } from '../store/useLangStore';

const mockData = [
  { subject: 'Math', es: 'Matemáticas', score: 95, fullMark: 100 },
  { subject: 'Science', es: 'Ciencias', score: 80, fullMark: 100 },
  { subject: 'History', es: 'Historia', score: 72, fullMark: 100 },
  { subject: 'Literature', es: 'Literatura', score: 88, fullMark: 100 },
  { subject: 'Art', es: 'Arte', score: 99, fullMark: 100 },
  { subject: 'P.E.', es: 'Ed. Física', score: 85, fullMark: 100 },
];

export default function StudentRadarChart() {
  const { lang } = useLangStore();

  const data = mockData.map(d => ({
    name: lang === 'es' ? d.es : d.subject,
    score: d.score,
    fullMark: d.fullMark
  }));

  return (
    <div className="h-64 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          <Radar name="Student" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
