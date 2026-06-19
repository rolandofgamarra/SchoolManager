import { API_BASE } from '../lib/api';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, BarChart3, CalendarDays, Bot, Lock, User, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const slides = [
  {
    id: 1,
    icon: BookOpen,
    iconBg: 'bg-amber-500',
    title: 'Administra tus clases',
    subtitle: 'Control total sobre tus grupos y materias',
    description: 'Organiza tus clases, mantén el registro de asistencia actualizado y gestiona las calificaciones de manera eficiente. Todo desde un panel centralizado, intuitivo y fácil de usar para que no pierdas tiempo en tareas manuales.'
  },
  {
    id: 2,
    icon: BarChart3,
    iconBg: 'bg-emerald-500',
    title: 'Analíticas por grado y alumno',
    subtitle: 'Decisiones basadas en datos en tiempo real',
    description: 'Monitorea el progreso académico de cada estudiante y del grupo en general. Identifica áreas de mejora, detecta patrones de rendimiento y genera reportes visuales detallados para compartir con padres y directivos.'
  },
  {
    id: 3,
    icon: CalendarDays,
    iconBg: 'bg-blue-600',
    title: 'Gestión de planes anuales y semanales',
    subtitle: 'Planificación inteligente y automatizada',
    description: 'Que tus docentes se dediquen a enseñar; nuestro sistema sugerirá planes semanales de acuerdo al plan anual de forma automática, optimizando el tiempo de preparación y asegurando el cumplimiento del currículo.'
  },
  {
    id: 4,
    icon: Bot,
    iconBg: 'bg-indigo-500',
    title: 'Chatbot inteligente',
    subtitle: 'Asistencia 24/7 impulsada por IA',
    description: 'Resuelve dudas sobre el sistema, consulta horarios, revisa el estado de tareas o genera reportes al instante con simples comandos de texto. Nuestro asistente virtual está siempre listo para ayudarte con consultas rápidas.'
  }
];

export default function Login() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [username, setUsername] = useState('Admin');
  const [password, setPassword] = useState('Admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        login(data.access, data.refresh, data.user);
        navigate('/');
      } else if (res.status === 403) {
        setError(data.detail || 'Cuenta bloqueada temporalmente.');
      } else {
        setError('Usuario o contraseña incorrectos.');
      }
    } catch {
      // Backend not running — fall back to prototype mode
      login('dev-token', 'dev-refresh', {
        id: 1,
        username,
        email: 'admin@schoolmanager.com',
        role: 'ADMIN',
        tenant_id: 1,
      });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-6xl mx-auto flex bg-white rounded-2xl shadow-2xl overflow-hidden min-h-[600px] border border-slate-100">
        
        {/* Left Side: Animated Carousel (Hidden on Mobile) */}
        <div className="hidden lg:flex w-1/2 bg-slate-50 relative overflow-hidden flex-col items-center justify-center p-12 border-r border-slate-100">
          
          <div className="w-full max-w-lg relative h-[450px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 flex flex-col justify-center"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-16 h-16 flex-shrink-0 rounded-2xl flex items-center justify-center text-white shadow-lg ${slides[currentSlide].iconBg}`}>
                    {(() => {
                      const Icon = slides[currentSlide].icon;
                      return <Icon className="w-8 h-8" />;
                    })()}
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800">{slides[currentSlide].title}</h2>
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-4 leading-snug">
                  {slides[currentSlide].subtitle}
                </h3>
                
                <p className="text-slate-600 text-sm leading-relaxed">
                  {slides[currentSlide].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots indicator */}
          <div className="absolute bottom-8 flex gap-3">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentSlide === index ? 'bg-primary scale-125' : 'bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-10 text-center lg:text-left">
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">SchoolManager <span className="text-primary">Pro</span></h1>
              <p className="text-slate-500 mt-2 text-sm">Inicia sesión para continuar al panel de administración.</p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Usuario o Correo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none bg-slate-50 focus:bg-white text-slate-700"
                    placeholder="admin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none bg-slate-50 focus:bg-white text-slate-700"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <a href="#" className="text-xs font-medium text-primary hover:text-primary-dark transition-colors">¿Olvidaste tu contraseña?</a>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-70"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Iniciar sesión'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-slate-500">
                Al iniciar sesión, aceptas nuestros <a href="#" className="text-primary hover:underline">Términos de Servicio</a> y <a href="#" className="text-primary hover:underline">Política de Privacidad</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
