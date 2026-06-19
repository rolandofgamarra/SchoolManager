import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import ProfileModal from './ProfileModal';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  ChevronDown,
  ChevronRight,
  UserCheck,
  GraduationCap,
  Calendar,
  FileText,
  Clock,
  LogOut,
  BarChart2,
  HeartHandshake,
  School,
  ClipboardList,
  CalendarCheck,
  FileDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLangStore } from '../store/useLangStore';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../locales/translations';

export default function Sidebar() {
  const { lang } = useLangStore();
  const dict = t[lang];
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      title: dict.dashboard,
      icon: LayoutDashboard,
      path: '/',
      key: 'Dashboard'
    },
    {
      title: dict.classManagement,
      icon: School,
      path: '/dashboard/class-management',
      key: 'ClassManagement',
      docenteOnly: true
    },
    {
      title: dict.gradebook,
      icon: ClipboardList,
      path: '/dashboard/gradebook',
      key: 'Gradebook',
      docenteOnly: true
    },
    {
      title: 'Asistencia',
      icon: CalendarCheck,
      path: '/dashboard/attendance',
      key: 'Attendance',
      docenteOnly: true
    },
    {
      title: dict.evaluationCalendar,
      icon: Calendar,
      path: '/dashboard/calendar',
      key: 'Calendar',
      docenteOnly: true
    },
    {
      title: dict.analytics,
      icon: BarChart2,
      path: '/dashboard/analytics',
      key: 'Analytics',
      notPadre: true
    },
    {
      title: 'Libretas / Report Cards',
      icon: FileDown,
      path: '/dashboard/report-cards',
      key: 'ReportCards',
      notPadre: true
    },
    {
      title: dict.academicPlans,
      icon: BookOpen,
      path: '/plans',
      key: 'Plans',
      notPadre: true
    },
    {
      title: dict.affectiveEval,
      icon: HeartHandshake,
      path: '/academics/affective',
      key: 'Affective',
      notPadre: true
    },
    {
      title: dict.courses,
      icon: BookOpen,
      key: 'Courses',
      adminOnly: true,
      subItems: [
        { title: dict.addCourse, path: '/courses/add', icon: FileText },
        { title: dict.upcomingCourses, path: '/courses/upcoming', icon: Calendar },
        { title: dict.ongoingCourses, path: '/courses/ongoing', icon: Clock },
        { title: dict.completedCourses, path: '/courses/completed', icon: UserCheck },
        { title: dict.allCourses, path: '/courses/all', icon: BookOpen },
      ],
    },
    {
      title: dict.parentPortal,
      icon: Users,
      key: 'ParentPortal',
      padreOnly: true,
      subItems: [
        { title: dict.myChildren, path: '/parent', icon: GraduationCap },
      ],
    },
    {
      title: dict.settings,
      icon: Settings,
      path: '/settings',
      key: 'Settings',
      adminOnly: true
    },
  ];

  const isDocente = user?.role === 'DOCENTE';
  const isAdminOrDirectivo = user?.role === 'ADMIN' || user?.role === 'DIRECTIVO';
  const isPadre = user?.role === 'PADRE';

  const filteredMenuItems = menuItems.filter((item: any) => {
    if (item.adminOnly && !isAdminOrDirectivo) return false;
    if (item.docenteOnly && !isDocente) return false;
    if (item.padreOnly && !isPadre) return false;
    if (item.notPadre && isPadre) return false;
    return true;
  });

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ 'Courses': true });
  const [showProfile, setShowProfile] = useState(false);
  const location = useLocation();

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
    {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    <aside className="w-64 bg-primary-dark text-white min-h-screen flex flex-col shadow-xl">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-wider">SchoolManager</h1>
        <p className="text-xs text-white/50 mt-1 uppercase tracking-widest">{dict.proEdition}</p>
      </div>

      <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => {
            const isActive = item.path === location.pathname;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isOpen = openMenus[item.key];

            return (
              <li key={item.key} className="px-3">
                {hasSubItems ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(item.key)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors hover:bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-white/70" />
                        <span className="font-medium text-sm">{item.title}</span>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-white/50" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-white/50" />
                      )}
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden mt-1 space-y-1"
                        >
                          {item.subItems?.map((sub: any) => {
                            const isSubActive = location.pathname === sub.path;
                            return (
                              <li key={sub.path}>
                                <NavLink
                                  to={sub.path}
                                  className={({ isActive }) => `
                                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ml-2
                                    ${isActive
                                      ? 'bg-accent text-white font-medium shadow-md shadow-accent/20'
                                      : 'text-white/70 hover:text-white hover:bg-white/5'}
                                  `}
                                >
                                  {sub.icon && <sub.icon className={`w-4 h-4 ${isSubActive ? 'text-white' : 'text-white/50'}`} />}
                                  {sub.title}
                                </NavLink>
                              </li>
                            );
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <NavLink
                    to={item.path!}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                      ${isActive
                        ? 'bg-accent text-white font-medium shadow-md shadow-accent/20'
                        : 'text-white/70 hover:text-white hover:bg-white/5'}
                    `}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/70'}`} />
                    {item.title}
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
          <button
            onClick={() => setShowProfile(true)}
            className="flex-shrink-0 focus:outline-none"
            title="Ver perfil / cambiar foto"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-accent/60"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm">
                {user ? user.username.substring(0, 2).toUpperCase() : 'US'}
              </div>
            )}
          </button>
          <button
            onClick={() => setShowProfile(true)}
            className="flex-1 min-w-0 text-left"
          >
            <p className="text-sm font-medium truncate">{user?.username || 'Usuario'}</p>
            <p className="text-xs text-white/50">{user?.role || dict.admin}</p>
          </button>
          <button onClick={handleLogout} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" title="Cerrar Sesión">
            <LogOut className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
