import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { useLangStore } from '../store/useLangStore';

// Generate some dummy data for the last 6 months
const generateData = () => {
  const today = new Date();
  const data = [];
  for (let i = 0; i < 180; i++) {
    const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
    // Weekends usually have 0 attendance (not counted) or we just skip them
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Random attendance: 1 = present, 2 = absent, 3 = late
    const status = Math.random() > 0.1 ? 1 : (Math.random() > 0.5 ? 2 : 3);
    data.push({
      date: date.toISOString().split('T')[0],
      count: status
    });
  }
  return data;
};

const mockData = generateData();

export default function AttendanceHeatmap() {
  const { lang } = useLangStore();
  const today = new Date();
  const startDate = new Date(today.getTime() - (180 * 24 * 60 * 60 * 1000));

  return (
    <div className="w-full overflow-x-auto text-xs py-4">
      {/* We add a custom wrapper to override the default styles and use our theme colors */}
      <style>{`
        .react-calendar-heatmap .color-scale-1 { fill: #10b981; } /* Presente */
        .react-calendar-heatmap .color-scale-2 { fill: #f43f5e; } /* Ausente */
        .react-calendar-heatmap .color-scale-3 { fill: #f59e0b; } /* Tardanza */
        .react-calendar-heatmap .color-empty { fill: #f1f5f9; }
      `}</style>
      
      <div className="min-w-[600px]">
        <CalendarHeatmap
          startDate={startDate}
          endDate={today}
          values={mockData}
          classForValue={(value: any) => {
            if (!value) return 'color-empty';
            return `color-scale-${value.count}`;
          }}
          tooltipDataAttrs={(value: any): { [key: string]: string } => {
            if (!value || !value.date) return {};
            let label = lang === 'es' ? 'Sin datos' : 'No data';
            if (value.count === 1) label = lang === 'es' ? 'Presente' : 'Present';
            if (value.count === 2) label = lang === 'es' ? 'Ausente' : 'Absent';
            if (value.count === 3) label = lang === 'es' ? 'Llegada tardía' : 'Late';
            return {
              'data-tooltip-id': 'heatmap-tooltip',
              'data-tooltip-content': `${value.date}: ${label}`
            };
          }}
          showWeekdayLabels={true}
        />
      </div>
      <div className="flex gap-4 mt-4 justify-center items-center text-slate-500 font-medium">
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#10b981]"></span> {lang === 'es' ? 'Presente' : 'Present'}</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#f59e0b]"></span> {lang === 'es' ? 'Tardanza' : 'Late'}</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#f43f5e]"></span> {lang === 'es' ? 'Ausente' : 'Absent'}</div>
      </div>
    </div>
  );
}
