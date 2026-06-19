import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuthStore } from './store/useAuthStore';

// Lazy loading: cada ruta es un chunk separado.
// El navegador descarga sólo el JS de la página que visita el usuario,
// reduciendo el bundle inicial de ~800 KB a ~150 KB.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const AddCourse = lazy(() => import('./pages/AddCourse'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const StudentProgress = lazy(() => import('./pages/StudentProgress'));
const AnnualPlans = lazy(() => import('./pages/AnnualPlans'));
const Settings = lazy(() => import('./pages/Settings'));
const Analytics = lazy(() => import('./pages/Analytics'));
const RsaEvaluation = lazy(() => import('./pages/RsaEvaluation'));
const ClassManagement = lazy(() => import('./pages/ClassManagement'));
const Gradebook = lazy(() => import('./pages/Gradebook'));
const EvaluationCalendar = lazy(() => import('./pages/EvaluationCalendar'));
const AttendanceRegister = lazy(() => import('./pages/AttendanceRegister'));
const ReportCards = lazy(() => import('./pages/ReportCards'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/"
            element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<Dashboard />} />
            <Route path="courses/add" element={<AddCourse />} />
            <Route path="parent" element={<ParentDashboard />} />
            <Route path="parent/student/:id" element={<StudentProgress />} />
            <Route path="plans" element={<AnnualPlans />} />
            <Route path="academics/affective" element={<RsaEvaluation />} />
            <Route path="settings" element={<Settings />} />
            <Route path="dashboard/analytics" element={<Analytics />} />
            <Route path="dashboard/class-management" element={<ClassManagement />} />
            <Route path="dashboard/gradebook" element={<Gradebook />} />
            <Route path="dashboard/calendar" element={<EvaluationCalendar />} />
            <Route path="dashboard/attendance" element={<AttendanceRegister />} />
            <Route path="dashboard/report-cards" element={<ReportCards />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
