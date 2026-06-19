import { API_BASE } from '../lib/api';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Users, Gift, BookOpen, Plus, Send, Bell, AlertTriangle, Cake, TrendingDown } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useLangStore } from '../store/useLangStore';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../locales/translations';
import AnnouncementModal from '../components/AnnouncementModal';
import './DashboardCalendar.css';

const StatCard = ({ icon: Icon, value, label, color, isLoading }: { icon: any, value: string | number, label: string, color: string, isLoading: boolean }) => {
  const colorMap: Record<string, string> = {
    'teal': 'bg-teal-50 text-teal-600 ring-teal-100',
    'orange': 'bg-orange-50 text-orange-600 ring-orange-100',
    'yellow': 'bg-amber-50 text-amber-600 ring-amber-100',
    'blue': 'bg-blue-50 text-blue-600 ring-blue-100',
    'primary': 'bg-primary/10 text-primary ring-primary/20',
  };
  const selectedStyle = colorMap[color] || colorMap['primary'];
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer group">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ring-1 ring-inset ${selectedStyle} transition-transform duration-300 group-hover:scale-110`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        {isLoading ? (
          <div className="h-8 w-16 bg-slate-200 animate-pulse rounded mb-1"></div>
        ) : (
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
        )}
        <p className="text-sm font-semibold text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
};

const nationalHolidays = [
  { date: '2026-01-01', name_es: 'Año Nuevo', name_en: 'New Year' },
  { date: '2026-03-01', name_es: 'Día de los Héroes', name_en: 'Heroes\' Day' },
  { date: '2026-04-02', name_es: 'Jueves Santo', name_en: 'Maundy Thursday' },
  { date: '2026-04-03', name_es: 'Viernes Santo', name_en: 'Good Friday' },
  { date: '2026-05-01', name_es: 'Día del Trabajador', name_en: 'Labor Day' },
  { date: '2026-05-14', name_es: 'Día de la Independencia', name_en: 'Independence Day' },
  { date: '2026-05-15', name_es: 'Día de la Madre', name_en: 'Mother\'s Day' },
  { date: '2026-06-12', name_es: 'Paz del Chaco', name_en: 'Chaco Peace' },
  { date: '2026-08-15', name_es: 'Fundación de Asunción', name_en: 'Foundation of Asunción' },
  { date: '2026-09-29', name_es: 'Batalla de Boquerón', name_en: 'Battle of Boquerón' },
  { date: '2026-12-08', name_es: 'Día de la Virgen de Caacupé', name_en: 'Virgin of Caacupé Day' },
  { date: '2026-12-25', name_es: 'Navidad', name_en: 'Christmas' }
];

interface AlertsData {
  birthdays_today: { nombre: string; grado: string; edad: number }[];
  birthdays_upcoming: { nombre: string; grado: string; dias_faltan: number; fecha: string }[];
  at_risk: { alumno__nombre: string; alumno__apellido: string; alumno__grado__nombre: string; promedio: number }[];
  low_attendance: { nombre: string; grado: string; porcentaje_asistencia: number }[];
  total_alerts: number;
}

export default function Dashboard() {
  const { lang } = useLangStore();
  const { accessToken } = useAuthStore();
  const dict = t[lang];
  const location = useLocation();
  const navigate = useNavigate();

  const [date, setDate] = useState<Date>(new Date());
  const [activeMonthDate, setActiveMonthDate] = useState<Date>(new Date());
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [selectedHolidayInfo, setSelectedHolidayInfo] = useState<{name: string, date: string} | null>(null);
  const [stats, setStats] = useState({
    total_students: 0, birthdays_count: 0,
    birthdays: [] as {nombre: string, grado: string, dia: number}[],
    total_subjects: 0, total_periods: 0
  });
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsTab, setAlertsTab] = useState<'birthdays' | 'risk' | 'attendance'>('birthdays');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('aviso') === 'true') {
      setIsAnnouncementModalOpen(true);
      navigate('/', { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    const authHeaders: HeadersInit = accessToken
      ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }
      : { 'Content-Type': 'application/json' };

    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/analytics/dashboard/`, { headers: authHeaders });
        if (res.ok) setStats(await res.json());
      } catch { /* silencio */ } finally { setIsLoading(false); }
    };

    const fetchAlerts = async () => {
      if (!accessToken) { setAlertsLoading(false); return; }
      try {
        const res = await fetch(`${API_BASE}/api/analytics/alerts/`, { headers: authHeaders });
        if (res.ok) setAlerts(await res.json());
      } catch { /* silencio */ } finally { setAlertsLoading(false); }
    };

    fetchStats();
    fetchAlerts();
  }, [accessToken]);

  const getHoliday = (d: Date) => {
    const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    return nationalHolidays.find(h => h.date === localDate);
  };

  const tileClassName = ({ date: d, view }: { date: Date, view: string }) => {
    if (view === 'month' && getHoliday(d)) return 'holiday-tile';
    return null;
  };

  const tileContent = ({ date: d, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const holiday = getHoliday(d);
      if (holiday) {
        return <div title={lang === 'es' ? holiday.name_es : holiday.name_en}><div className="holiday-dot"></div></div>;
      }
    }
    return null;
  };

  const handleDayClick = (clickedDate: Date) => {
    setDate(clickedDate);
    const holiday = getHoliday(clickedDate);
    if (holiday) {
      const holidayName = lang === 'es' ? holiday.name_es : holiday.name_en;
      const formattedDate = clickedDate.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'long' });
      setSelectedHolidayInfo({ name: holidayName, date: formattedDate });
    } else {
      setSelectedHolidayInfo(null);
    }
  };

  const holidaysInActiveMonth = nationalHolidays.filter(h => {
    const [year, month] = h.date.split('-');
    return parseInt(year) === activeMonthDate.getFullYear() && parseInt(month) === (activeMonthDate.getMonth() + 1);
  }).length;

  const totalAlerts = alerts?.total_alerts || 0;
  const hasBirthdaysToday = (alerts?.birthdays_today.length || 0) > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-slate-800">{dict.adminDashboard}</h1>
        <div className="text-sm text-slate-500 font-medium bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100">
          {dict.home} / {dict.dashboard}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={Users} value={stats.total_students} label={dict.totalStudents} color="teal" isLoading={isLoading} />
        <div className="relative group">
          <StatCard icon={Gift} value={stats.birthdays_count} label={dict.birthdaysThisMonth || 'Cumpleaños del Mes'} color="orange" isLoading={isLoading} />
          {stats.birthdays.length > 0 && (
            <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 p-3 pointer-events-none">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Este mes cumplen:</h4>
              <ul className="space-y-2">
                {stats.birthdays.map((b, idx) => (
                  <li key={idx} className="flex justify-between items-center border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{b.nombre}</p>
                      <p className="text-xs text-slate-500">{b.grado}</p>
                    </div>
                    <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded">Día {b.dia}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <StatCard isLoading={isLoading} icon={BookOpen} value={stats.total_subjects} label={dict.totalSubjects} color="yellow" />
        <StatCard isLoading={false} icon={CalendarIcon} value={holidaysInActiveMonth} label={dict.totalHolidays || "Feriados del Mes"} color="blue" />
      </div>

      {/* Birthday today banner */}
      {hasBirthdaysToday && (
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl p-4 flex items-center gap-4 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="bg-white/20 rounded-xl p-3">
            <Cake className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-base">¡Cumpleaños hoy!</p>
            <p className="text-sm text-white/90">
              {alerts!.birthdays_today.map(b => `${b.nombre} (${b.grado}, ${b.edad} años)`).join(' • ')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Actions + Alerts Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">{dict.quickActions}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/dashboard/class-management')}
                className="flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-accent hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors text-accent">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-700 text-center">{dict.addStudent}</span>
              </button>
              <button
                onClick={() => navigate('/dashboard/attendance')}
                className="flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-accent hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors text-accent">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-700 text-center">Tomar Asistencia</span>
              </button>
              <button
                onClick={() => setIsAnnouncementModalOpen(true)}
                className="flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-accent hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors text-accent">
                  <Send className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-700 text-center whitespace-pre-line">{dict.sendAnnouncement}</span>
              </button>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-slate-800">Alertas del Sistema</h2>
                {totalAlerts > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{totalAlerts}</span>
                )}
              </div>
              <div className="flex gap-1">
                {([
                  { key: 'birthdays', label: 'Cumpleaños', icon: Cake },
                  { key: 'risk', label: 'En Riesgo', icon: TrendingDown },
                  { key: 'attendance', label: 'Asistencia', icon: AlertTriangle },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setAlertsTab(tab.key)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      alertsTab === tab.key
                        ? 'bg-primary text-white'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {alertsLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : alertsTab === 'birthdays' ? (
                <div className="space-y-2">
                  {/* Today */}
                  {(alerts?.birthdays_today.length || 0) > 0 && (
                    <>
                      <p className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-1">Hoy</p>
                      {alerts!.birthdays_today.map((b, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                          <span className="text-xl">🎂</span>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{b.nombre}</p>
                            <p className="text-xs text-slate-500">{b.grado} • {b.edad} años</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {/* Upcoming */}
                  {(alerts?.birthdays_upcoming.length || 0) > 0 && (
                    <>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-3 mb-1">Próximos 7 días</p>
                      {alerts!.birthdays_upcoming.map((b, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-10 h-10 bg-orange-100 rounded-xl flex flex-col items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-orange-600">{b.fecha}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700 text-sm">{b.nombre}</p>
                            <p className="text-xs text-slate-500">{b.grado} · en {b.dias_faltan} día{b.dias_faltan !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {(alerts?.birthdays_today.length || 0) === 0 && (alerts?.birthdays_upcoming.length || 0) === 0 && (
                    <p className="text-center text-slate-400 text-sm py-6">Sin cumpleaños en los próximos 7 días</p>
                  )}
                </div>
              ) : alertsTab === 'risk' ? (
                <div className="space-y-2">
                  {(alerts?.at_risk.length || 0) === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-6">Sin alumnos en riesgo académico</p>
                  ) : alerts!.at_risk.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-sm font-black text-red-600">{Number(s.promedio).toFixed(1)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{s.alumno__nombre} {s.alumno__apellido}</p>
                        <p className="text-xs text-slate-500">{s.alumno__grado__nombre}</p>
                      </div>
                      <span className="ml-auto text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">En riesgo</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(alerts?.low_attendance.length || 0) === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-6">Sin alertas de asistencia baja</p>
                  ) : alerts!.low_attendance.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-sm font-black text-amber-600">{s.porcentaje_asistencia}%</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{s.nombre}</p>
                        <p className="text-xs text-slate-500">{s.grado}</p>
                      </div>
                      <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Asistencia baja</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Calendar */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">{dict.academicCalendar}</h2>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden flex justify-center p-4 bg-slate-50 flex-grow">
            <Calendar
              onChange={() => {}}
              onClickDay={handleDayClick}
              value={date}
              onActiveStartDateChange={({ activeStartDate }) => {
                if (activeStartDate) setActiveMonthDate(activeStartDate);
              }}
              className="w-full border-none shadow-none bg-transparent text-slate-700 font-medium dashboard-calendar"
              locale={lang === 'es' ? 'es-ES' : 'en-US'}
              tileClassName={tileClassName}
              tileContent={tileContent}
            />
          </div>
          {selectedHolidayInfo && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="bg-red-100 p-2 rounded-full text-red-600 mt-0.5 shrink-0">
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-red-800 text-sm leading-tight mb-1">{selectedHolidayInfo.name}</h4>
                <p className="text-red-600 text-xs font-medium">{selectedHolidayInfo.date}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        dict={dict}
      />
    </div>
  );
}
