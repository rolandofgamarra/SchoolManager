
import { Bold, Italic, Underline, Link, List, ListOrdered } from 'lucide-react';
import { useLangStore } from '../store/useLangStore';
import { t } from '../locales/translations';

export default function AddCourse() {
  const { lang } = useLangStore();
  const dict = t[lang];

  return (
    <div className="max-w-4xl bg-white rounded-xl shadow-sm border border-slate-100 min-h-[calc(100vh-8rem)]">
      <div className="px-8 py-5 border-b border-slate-100">
        <h1 className="text-xl font-medium text-slate-800">{dict.addCourse}</h1>
      </div>
      
      <div className="p-8">
        <form className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
            <label className="text-sm font-medium text-slate-700">{dict.courseName} <span className="text-accent">*</span></label>
            <input 
              type="text" 
              className="w-full border-accent border-2 rounded-md px-3 py-2 text-sm focus:outline-none shadow-sm shadow-accent/10 transition-shadow"
              placeholder=""
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
            <label className="text-sm font-medium text-slate-700">{dict.courseCode}</label>
            <input 
              type="text" 
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
            <label className="text-sm font-medium text-slate-700">{dict.category} <span className="text-accent">*</span></label>
            <select className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-white text-slate-600 appearance-none">
              <option>{dict.select}</option>
              <option>{dict.mathematics}</option>
              <option>{dict.science}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
            <label className="text-sm font-medium text-slate-700">{dict.startDate} <span className="text-accent">*</span></label>
            <input 
              type="text" 
              placeholder="dd-MMM-yyyy"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
            <label className="text-sm font-medium text-slate-700">{dict.endDate} <span className="text-accent">*</span></label>
            <input 
              type="text" 
              placeholder="dd-MMM-yyyy"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
            <label className="text-sm font-medium text-slate-700 pt-2">{dict.courseSummary}</label>
            <div className="border border-slate-200 rounded-md overflow-hidden bg-slate-50">
              {/* Rich text toolbar placeholder */}
              <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-white">
                <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded border border-slate-200 bg-white"><Bold className="w-4 h-4" /></button>
                <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded border border-slate-200 bg-white"><Italic className="w-4 h-4" /></button>
                <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded border border-slate-200 bg-white"><Underline className="w-4 h-4" /></button>
                
                <div className="h-4 w-px bg-slate-300 mx-1"></div>
                
                <select className="border border-slate-200 rounded px-2 py-1 text-sm bg-white text-slate-700">
                  <option>DejaVuSans</option>
                </select>
                
                <select className="border border-slate-200 rounded px-2 py-1 text-sm bg-white text-slate-700">
                  <option>10</option>
                </select>

                <div className="h-4 w-px bg-slate-300 mx-1"></div>

                <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded border border-slate-200 bg-white"><span className="w-4 h-4 font-serif font-bold text-sm">A</span></button>
                <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded border border-slate-200 bg-white"><Link className="w-4 h-4" /></button>
                <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded border border-slate-200 bg-white"><List className="w-4 h-4" /></button>
                <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded border border-slate-200 bg-white"><ListOrdered className="w-4 h-4" /></button>
              </div>
              <textarea 
                className="w-full h-48 p-4 text-sm focus:outline-none bg-white resize-y"
                placeholder=""
              ></textarea>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button type="button" className="bg-accent hover:bg-accent-hover text-white px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-sm shadow-accent/20">
              {dict.saveCourse}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
