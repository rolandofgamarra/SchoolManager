import { API_BASE } from '../lib/api';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Building2, Link2, BookOpenCheck } from 'lucide-react';
import { useLangStore } from '../store/useLangStore';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../locales/translations';

const schema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  logo_url: z.string().url("Debe ser una URL válida").or(z.literal("")),
  config_json: z.object({
    grading_system: z.enum(['letters', 'numbers', 'us'])
  })
});

type SettingsFormData = z.infer<typeof schema>;

export default function Settings() {
  const { lang } = useLangStore();
  const { accessToken } = useAuthStore();
  const dict = t[lang];
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
  };

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SettingsFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: "",
      logo_url: "",
      config_json: { grading_system: 'letters' }
    }
  });

  useEffect(() => {
    // Fetch initial settings
    fetch(`${API_BASE}/api/tenant/settings/`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        if (data.nombre) setValue('nombre', data.nombre);
        if (data.logo_url) setValue('logo_url', data.logo_url);
        if (data.config_json?.grading_system) setValue('config_json.grading_system', data.config_json.grading_system);
      })
      .catch(err => console.error("Error fetching settings:", err));
  }, [setValue]);

  const onSubmit = async (data: SettingsFormData) => {
    setIsSaving(true);
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/tenant/settings/`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setSuccessMsg(dict.settingsSaved);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{dict.institutionSettings}</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" />
            {dict.institutionSettings}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {successMsg && (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm font-medium border border-green-200">
              {successMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{dict.institutionName}</label>
            <div className="relative">
              <Building2 className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                {...register('nombre')}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{dict.logoUrl}</label>
            <div className="relative">
              <Link2 className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                {...register('logo_url')}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://..."
              />
            </div>
            {errors.logo_url && <p className="text-red-500 text-xs mt-1">{errors.logo_url.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{dict.gradingSystem}</label>
            <div className="relative">
              <BookOpenCheck className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                {...register('config_json.grading_system')}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
              >
                <option value="letters">{dict.gradingSystemLetters}</option>
                <option value="numbers">{dict.gradingSystemNumbers}</option>
                <option value="us">{dict.gradingSystemUS}</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '...' : dict.saveChanges}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
