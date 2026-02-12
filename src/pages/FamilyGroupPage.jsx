import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { dataService } from '../services/dataService';
import PermissionsModal from '../components/PermissionsModal';

const FamilyGroupPage = () => {
  const { user, updateUser } = useAuth();
  const { showAlert, showConfirm } = useFeedback();
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchFamily = async () => {
        try {
           const members = await dataService.getFamilyMembers(user.id);
           setFamilyMembers(members);
        } catch (error) {
           console.error('Error fetching family:', error);
        } finally {
           setLoading(false);
        }
      };
      
      fetchFamily();
    }
  }, [user]);

  const handleAddFamilyMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail) return;
    
    setAddingMember(true);
    try {
       await dataService.addFamilyMember(user.id, newMemberEmail);
       setNewMemberEmail('');
       // Refresh list
       const members = await dataService.getFamilyMembers(user.id);
       setFamilyMembers(members);
       showAlert('Miembro familiar agregado exitosamente', 'Éxito', 'success');
    } catch (error) {
       if (error.message === "Este usuario ya pertenece a otro grupo familiar") {
           const confirmed = await showConfirm(
               "Este usuario ya tiene su propio grupo familiar. ¿Deseas enviarle una invitación para que se una al tuyo?",
               "Invitar al Grupo",
               { status: 'info', confirmText: 'Enviar Invitación', cancelText: 'Cancelar' }
           );

           if (confirmed) {
               try {
                   // When inviting someone who already has a family, we send a request
                   // for THEM to join US (Invite), not for US to join THEM.
                   const response = await dataService.sendFamilyRequest(user.id, newMemberEmail);
                   setNewMemberEmail('');
                   
                   showAlert('Se ha enviado una solicitud al usuario para que se una a tu grupo familiar.', 'Solicitud Enviada', 'success');
               } catch (joinError) {
                   showAlert(joinError.message, 'Error al enviar solicitud', 'error');
               }
           }
       } else {
           showAlert(error.message, 'Error', 'error');
       }
    } finally {
       setAddingMember(false);
    }
  };

  const handleSavePermissions = async (allowedEditors) => {
    try {
      await updateUser({ allowed_editors: allowedEditors });
    } catch (error) {
      console.error('Error updating permissions:', error);
      showAlert('Error al guardar permisos', 'Error', 'error');
    }
  };

  const handleRemoveMember = async (memberId) => {
    const confirmed = await showConfirm(
      '¿Estás seguro de que quieres eliminar a este miembro del grupo familiar?',
      'Eliminar Miembro',
      { status: 'warning', confirmText: 'Eliminar', cancelText: 'Cancelar' }
    );
    
    if (!confirmed) return;

    try {
      await dataService.removeFamilyMember(user.id, memberId);
      const members = await dataService.getFamilyMembers(user.id);
      setFamilyMembers(members);
      showAlert('Miembro eliminado del grupo familiar', 'Eliminado', 'success');
    } catch (error) {
      showAlert(error.message, 'Error', 'error');
    }
  };

  const handleLeaveGroup = async () => {
    const confirmed = await showConfirm(
        '¿Estás seguro de que quieres salir del grupo familiar? perderás acceso a los calendarios compartidos.',
        'Salir del Grupo',
        { status: 'warning', confirmText: 'Salir', cancelText: 'Cancelar' }
    );

    if (!confirmed) return;

    try {
      await dataService.leaveFamilyGroup(user.id);
      setFamilyMembers([]);
      showAlert('Has salido del grupo familiar exitosamente', 'Grupo Abandonado', 'success');
    } catch (error) {
      showAlert(error.message, 'Error', 'error');
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 z-10 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md">
        <button 
          onClick={() => navigate(-1)}
          className="size-10 -ml-2 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Grupo Familiar</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <div className="flex flex-col items-center pt-4 pb-8 max-w-lg mx-auto w-full">
            


            {/* Members List */}
            <div className="w-full space-y-4">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Miembros</h2>
                
                {loading ? (
                    <div className="space-y-3">
                        <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                        <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                    </div>
                ) : familyMembers.length > 0 ? (
                    familyMembers.map(member => (
                    <div key={member.id} className="bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm group">
                        <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden">
                            {member.avatar_url && (member.avatar_url.startsWith('http') || member.avatar_url.startsWith('/')) ? (
                                <img src={member.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-2xl">
                                    {member.avatar_url || 'account_circle'}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{member.full_name}</p>
                            <p className="text-sm text-slate-500 truncate">{member.email}</p>
                        </div>
                        <button 
                            onClick={() => handleRemoveMember(member.id)}
                            className="size-10 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/40 transition-colors"
                            title="Eliminar del grupo"
                        >
                            <span className="material-symbols-outlined text-[20px]">person_remove</span>
                        </button>
                    </div>
                    ))
                ) : (
                    <div className="text-center py-12 bg-white dark:bg-surface-dark rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">group_off</span>
                        <p className="text-slate-500 font-medium">No tienes miembros familiares</p>
                        <p className="text-sm text-slate-400">Invita a alguien para empezar</p>
                    </div>
                )}
            </div>

            {/* Add Member Form */}
            <div className="w-full mt-8">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1 mb-3">Invitar Miembro</h2>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">mail</span>
                        <input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-slate-900 dark:text-white"
                        />
                    </div>
                    <button 
                        type="button"
                        onClick={handleAddFamilyMember}
                        disabled={addingMember || !newMemberEmail}
                        className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/25"
                    >
                        {addingMember ? (
                            <div className="size-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                        ) : (
                            'Invitar'
                        )}
                    </button>
                </div>
                <p className="text-xs text-slate-400 mt-2 ml-1">
                    <span className="material-symbols-outlined text-[14px] align-text-bottom mr-1">info</span>
                    Asegúrate de usar el correo exacto con el que tu familiar se registró en la app.
                </p>
            </div>

            {/* Permissions Action */}
            {familyMembers.length > 0 && (
                <div className="w-full mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <button 
                        onClick={() => setShowPermissionsModal(true)}
                        className="w-full py-4 px-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-3 group"
                    >
                        <div className="size-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                             <span className="material-symbols-outlined text-primary">lock_person</span>
                        </div>
                        <span>Gestionar Permisos de Edición</span>
                    </button>
                    
                    <button 
                        onClick={handleLeaveGroup}
                        className="w-full py-4 px-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-3 group"
                    >
                        <div className="size-10 rounded-full bg-white dark:bg-red-900/30 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                             <span className="material-symbols-outlined text-red-500">logout</span>
                        </div>
                        <span>Salir del Grupo Familiar</span>
                    </button>
                </div>
            )}
            
            {familyMembers.length > 0 && (
                <p className="text-center text-xs text-slate-400 mt-4 px-4">
                    Controla qué miembros de tu familia pueden agregar, editar o eliminar eventos en tu calendario personal.
                </p>
            )}

        </div>
      </div>
      
      <PermissionsModal 
        isOpen={showPermissionsModal} 
        onClose={() => setShowPermissionsModal(false)}
        currentUser={user}
        familyMembers={familyMembers}
        onSave={handleSavePermissions}
      />
    </div>
  );
};

export default FamilyGroupPage;
