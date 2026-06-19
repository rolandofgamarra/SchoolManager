import { API_BASE } from '../lib/api';
import { useState, useEffect } from 'react';
import { School, BookOpen, GraduationCap, Users, Plus, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function ClassManagement() {
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'grade' | 'subject' | 'student' | 'parent'>('grade');

  const [grades, setGrades] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [, setSubjects] = useState<any[]>([]);

  // Formularios
  const [gradeName, setGradeName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [selectedGradeForSubj, setSelectedGradeForSubj] = useState('');
  
  const [studentName, setStudentName] = useState('');
  const [studentLastName, setStudentLastName] = useState('');
  const [studentDob, setStudentDob] = useState('');
  const [selectedGradeForStudent, setSelectedGradeForStudent] = useState('');

  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [selectedStudentForParent, setSelectedStudentForParent] = useState('');

  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const headers = { 'Authorization': `Bearer ${accessToken}` };
    try {
      const [resG, resS, resSub] = await Promise.all([
        fetch(`${API_BASE}/api/academics/grades/`, { headers }),
        fetch(`${API_BASE}/api/academics/students/`, { headers }),
        fetch(`${API_BASE}/api/academics/subjects/`, { headers })
      ]);
      const gData = await resG.json();
      const stData = await resS.json();
      const subData = await resSub.json();
      setGrades(gData.results || gData);
      setStudents(stData.results || stData);
      setSubjects(subData.results || subData);
    } catch (e) { console.error(e); }
  };

  const handleCreateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/academics/grades/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ nombre: gradeName, nivel: 'PRIMARIA' }) // nivel por defecto
      });
      if (res.ok) {
        setMsg('Clase creada con éxito');
        setGradeName('');
        fetchData();
        setTimeout(() => { setMsg(''); setActiveTab('subject'); }, 1500);
      }
    } catch (e) { console.error(e); }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/academics/subjects/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ nombre: subjectName, grado: selectedGradeForSubj })
      });
      if (res.ok) {
        setMsg('Materia registrada con éxito');
        setSubjectName('');
        fetchData();
        setTimeout(() => setMsg(''), 1500);
      }
    } catch (e) { console.error(e); }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/academics/students/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ 
          nombre: studentName, 
          apellido: studentLastName, 
          fecha_nac: studentDob, 
          grado: selectedGradeForStudent 
        })
      });
      if (res.ok) {
        setMsg('Alumno inscripto con éxito');
        setStudentName(''); setStudentLastName(''); setStudentDob('');
        fetchData();
        setTimeout(() => { setMsg(''); setActiveTab('parent'); }, 1500);
      }
    } catch (e) { console.error(e); }
  };

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/users/quick-parent/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ 
          nombre: parentName, 
          email: parentEmail, 
          telefono: parentPhone,
          student_id: selectedStudentForParent
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Tutor vinculado. (Clave temporal del tutor: ${data.temporary_password || 'Ya existía'})`);
        setParentName(''); setParentEmail(''); setParentPhone('');
        setTimeout(() => setMsg(''), 5000);
      } else {
        alert(data.detail);
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <School className="w-8 h-8 text-primary" />
          Mi Aula - Gestión de Clase
        </h1>
        <p className="text-slate-500 mt-2 ml-11">
          Configura tu entorno: crea tu grado, inscribe alumnos y vincula a sus padres.
        </p>
      </div>

      {msg && (
        <div className="bg-green-50 text-green-700 border border-green-200 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <p className="font-medium">{msg}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          <button 
            className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-4 font-medium text-sm transition-colors ${activeTab === 'grade' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('grade')}
          >
            <School className="w-4 h-4" /> 1. Clase
          </button>
          <button 
            className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-4 font-medium text-sm transition-colors ${activeTab === 'subject' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('subject')}
          >
            <BookOpen className="w-4 h-4" /> 2. Materias
          </button>
          <button 
            className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-4 font-medium text-sm transition-colors ${activeTab === 'student' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('student')}
          >
            <GraduationCap className="w-4 h-4" /> 3. Alumnos
          </button>
          <button 
            className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-4 font-medium text-sm transition-colors ${activeTab === 'parent' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('parent')}
          >
            <Users className="w-4 h-4" /> 4. Padres
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: GRADO */}
          {activeTab === 'grade' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800">Crear Nueva Clase / Grado</h2>
              <form onSubmit={handleCreateGrade} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre de la Clase (Ej: 5th Grade)</label>
                  <input type="text" value={gradeName} onChange={e => setGradeName(e.target.value)} required className="w-full border-slate-200 rounded-lg focus:border-primary focus:ring-primary/20" />
                </div>
                <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors flex items-center gap-2 h-[42px]">
                  <Plus className="w-4 h-4" /> Crear
                </button>
              </form>
              
              <div className="mt-8">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Clases Existentes</h3>
                <div className="flex gap-3 flex-wrap">
                  {grades.map(g => (
                    <span key={g.id} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200">
                      {g.nombre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MATERIAS */}
          {activeTab === 'subject' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800">Registrar Materias</h2>
              <form onSubmit={handleCreateSubject} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Clase / Grado</label>
                  <select value={selectedGradeForSubj} onChange={e => setSelectedGradeForSubj(e.target.value)} required className="w-full border-slate-200 rounded-lg focus:border-primary focus:ring-primary/20">
                    <option value="">Seleccionar...</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre de la Materia</label>
                  <input type="text" value={subjectName} onChange={e => setSubjectName(e.target.value)} required className="w-full border-slate-200 rounded-lg focus:border-primary focus:ring-primary/20" />
                </div>
                <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors flex items-center gap-2 h-[42px]">
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: ALUMNOS */}
          {activeTab === 'student' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800">Inscribir Alumnos</h2>
              <form onSubmit={handleCreateStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Asignar a Clase</label>
                  <select value={selectedGradeForStudent} onChange={e => setSelectedGradeForStudent(e.target.value)} required className="w-full border-slate-200 rounded-lg focus:border-primary focus:ring-primary/20">
                    <option value="">Seleccionar...</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nombres</label>
                  <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} required className="w-full border-slate-200 rounded-lg focus:border-primary focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Apellidos</label>
                  <input type="text" value={studentLastName} onChange={e => setStudentLastName(e.target.value)} required className="w-full border-slate-200 rounded-lg focus:border-primary focus:ring-primary/20" />
                </div>
                <div className="md:col-span-2 flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Fecha de Nacimiento</label>
                    <input type="date" value={studentDob} onChange={e => setStudentDob(e.target.value)} required className="w-full border-slate-200 rounded-lg focus:border-primary focus:ring-primary/20" />
                  </div>
                  <button type="submit" className="bg-primary text-white px-8 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors h-[42px]">
                    Inscribir Alumno
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: TUTORES */}
          {activeTab === 'parent' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800">Vincular Padre o Tutor</h2>
              <form onSubmit={handleCreateParent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Seleccionar Alumno (Hijo/a)</label>
                  <select value={selectedStudentForParent} onChange={e => setSelectedStudentForParent(e.target.value)} required className="w-full border-slate-200 rounded-lg focus:border-primary focus:ring-primary/20">
                    <option value="">Buscar alumno...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.apellido}, {s.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre del Tutor</label>
                  <input type="text" value={parentName} onChange={e => setParentName(e.target.value)} required className="w-full border-slate-200 rounded-lg focus:border-primary focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Teléfono de Contacto</label>
                  <input type="text" value={parentPhone} onChange={e => setParentPhone(e.target.value)} required className="w-full border-slate-200 rounded-lg focus:border-primary focus:ring-primary/20" />
                </div>
                <div className="md:col-span-2 flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico (Para portal y avisos)</label>
                    <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} required className="w-full border-slate-200 rounded-lg focus:border-primary focus:ring-primary/20" />
                  </div>
                  <button type="submit" className="bg-primary text-white px-8 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors h-[42px]">
                    Crear y Vincular
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
