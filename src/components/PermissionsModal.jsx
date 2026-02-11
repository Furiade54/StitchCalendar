import React, { useState, useEffect } from 'react';

const PermissionsModal = ({ isOpen, onClose, currentUser, familyMembers, onSave }) => {
  const [allowedEditors, setAllowedEditors] = useState([]);

  useEffect(() => {
    if (currentUser && currentUser.allowed_editors) {
      setAllowedEditors(currentUser.allowed_editors);
    } else {
      setAllowedEditors([]);
    }
  }, [currentUser, isOpen]);

  const toggleEditor = (memberId) => {
    if (allowedEditors.includes(memberId)) {
      setAllowedEditors(allowedEditors.filter(id => id !== memberId));
    } else {
      setAllowedEditors([...allowedEditors, memberId]);
    }
  };

  const handleSave = () => {
    onSave(allowedEditors);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
           <h3 className="text-lg font-bold text-slate-900 dark:text-white">Permisos de Edición</h3>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
             <span className="material-symbols-outlined">close</span>
           </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
           <p className="text-sm text-slate-500 dark:text-slate-400">
             Selecciona los miembros de tu familia que pueden <strong>editar, crear y eliminar</strong> eventos en tu calendario.
           </p>

           <div className="space-y-2">
             {familyMembers.length > 0 ? (
               familyMembers.map(member => (
                 <div 
                   key={member.id} 
                   onClick={() => toggleEditor(member.id)}
                   className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                     allowedEditors.includes(member.id)
                       ? 'border-primary bg-primary/5 dark:bg-primary/10'
                       : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                   }`}
                 >
                   <span className="material-symbols-outlined text-2xl text-slate-400">
                     {member.avatar_url || 'account_circle'}
                   </span>
                   <div className="flex-1">
                     <p className="font-medium text-slate-900 dark:text-white">{member.full_name}</p>
                     <p className="text-xs text-slate-500">{member.email}</p>
                   </div>
                   
                   <div className={`size-6 rounded-full border flex items-center justify-center transition-colors ${
                     allowedEditors.includes(member.id)
                       ? 'bg-primary border-primary text-white'
                       : 'border-slate-300 dark:border-slate-600'
                   }`}>
                     {allowedEditors.includes(member.id) && <span className="material-symbols-outlined text-sm">check</span>}
                   </div>
                 </div>
               ))
             ) : (
               <p className="text-sm text-slate-400 italic text-center py-4">No tienes miembros familiares agregados.</p>
             )}
           </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-3 px-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
          >
            Guardar Permisos
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;
