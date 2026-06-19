import { API_BASE } from '../lib/api';
import { useState, useEffect, useRef } from 'react';
import { Bell, Search, Menu, Globe, Command, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLangStore } from '../store/useLangStore';
import { useAuthStore } from '../store/useAuthStore';

export default function Header() {
  const { lang, toggleLang } = useLangStore();
  const { accessToken, user } = useAuthStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [studentsResult, setStudentsResult] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for students when using /falta
  useEffect(() => {
    if (query.toLowerCase().startsWith('/falta ')) {
      const searchStr = query.slice(7).trim();
      if (searchStr.length >= 2) {
        setIsSearching(true);
        const delayDebounceFn = setTimeout(() => {
          fetch(`${API_BASE}/api/academics/students/?search=${searchStr}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
          .then(res => res.json())
          .then(data => {
            setStudentsResult(data.results || data);
            setIsSearching(false);
          })
          .catch(err => {
            console.error(err);
            setIsSearching(false);
          });
        }, 500);

        return () => clearTimeout(delayDebounceFn);
      } else {
        setStudentsResult([]);
      }
    }
  }, [query, accessToken]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (val.startsWith('/')) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  };

  const handleCommandExecution = async (command: string, extraData?: any) => {
    setIsDropdownOpen(false);
    setQuery('');

    if (command === '/calificar') {
      navigate('/dashboard/gradebook');
    } else if (command === '/aviso') {
      navigate('/?aviso=true');
    } else if (command === '/falta' && extraData) {
      // Registrar falta injustificada
      const student = extraData;
      const today = new Date().toISOString().split('T')[0];

      try {
        const res = await fetch(`${API_BASE}/api/academics/attendance/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            alumno: student.id,
            fecha: today,
            estado: 'AUSENTE_INJUSTIFICADO',
            justificacion: 'Registrado vía Comando Rápido'
          })
        });

        if (res.ok) {
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 3000);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const staticCommands = [
    { cmd: '/calificar', desc: 'Ir al Libro de Calificaciones' },
    { cmd: '/aviso', desc: 'Redactar nuevo anuncio a familias' },
    { cmd: '/falta', desc: 'Escribe "/falta Nombre" para ausente injustificado' }
  ].filter(c => c.cmd.startsWith(query.split(' ')[0].toLowerCase()) && !query.toLowerCase().startsWith('/falta '));

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md">
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Omnibar */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all w-80 relative">
          {query.startsWith('/') ? (
            <Command className="w-4 h-4 text-primary" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
          
          <input 
            type="text" 
            placeholder="Escribe '/' para comandos rápidos..." 
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 text-slate-800 font-medium"
            value={query}
            onChange={handleInputChange}
            onClick={() => query.startsWith('/') && setIsDropdownOpen(true)}
          />
        </div>

        {/* Dropdown Commands Palette */}
        {isDropdownOpen && query.startsWith('/') && (
          <div className="absolute top-12 left-10 lg:left-0 w-[400px] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
              Resultados
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {/* Static Commands */}
              {!query.toLowerCase().startsWith('/falta ') && staticCommands.map(c => (
                <button 
                  key={c.cmd}
                  onClick={() => handleCommandExecution(c.cmd)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 flex flex-col gap-1 transition-colors"
                >
                  <span className="font-bold text-primary text-sm bg-primary/10 px-2 py-0.5 rounded w-fit">{c.cmd}</span>
                  <span className="text-xs text-slate-500">{c.desc}</span>
                </button>
              ))}

              {/* Dynamic Students Search for /falta */}
              {query.toLowerCase().startsWith('/falta ') && (
                <div className="p-2">
                  <div className="text-xs font-medium text-slate-400 mb-2 px-2">Buscando alumno para inasistencia...</div>
                  {isSearching && (
                    <div className="flex justify-center p-4">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                    </div>
                  )}
                  {!isSearching && studentsResult.length === 0 && query.length > 8 && (
                    <div className="p-4 text-sm text-slate-500 text-center">No se encontraron alumnos con ese nombre.</div>
                  )}
                  {!isSearching && studentsResult.map(student => (
                    <button 
                      key={student.id}
                      onClick={() => handleCommandExecution('/falta', student)}
                      className="w-full text-left px-3 py-2 hover:bg-rose-50 rounded-lg flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="font-bold text-slate-700 group-hover:text-rose-700">{student.nombre} {student.apellido}</div>
                        <div className="text-xs text-slate-500">Documento: {student.numero_documento}</div>
                      </div>
                      <div className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Marcar Ausente
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleLang}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors border border-slate-200 text-sm font-medium text-slate-600"
          title="Switch Language"
        >
          <Globe className="w-4 h-4 text-slate-500" />
          {lang === 'es' ? 'EN' : 'ES'}
        </button>

        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full border-2 border-white"></span>
        </button>
        <div className="h-8 w-px bg-slate-200 mx-1"></div>
        <div className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm font-medium text-slate-700 hidden sm:block">
            {user?.role === 'DOCENTE' ? 'Docente' : 'Directivo'}
          </span>
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'default'}`} 
            alt="Avatar" 
            className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50"
          />
        </div>
      </div>

      {/* Success Toast for Quick Action */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="font-bold text-sm">Acción Exitosa</p>
            <p className="text-xs text-slate-300">La inasistencia ha sido registrada.</p>
          </div>
        </div>
      )}
    </header>
  );
}
