import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { dataService } from '../services/dataService';

const UserProfilePage = () => {
  const { user, signOut, updateUser } = useAuth();
  const { showAlert } = useFeedback();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ completedTasks: 0, upcomingEvents: 0 });
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    avatar_url: '',
    password: '',
    confirmPassword: '',
    currentPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        username: user.username || '',
        email: user.email || '',
        avatar_url: user.avatar_url || '',
        password: '',
        confirmPassword: '',
        currentPassword: ''
      });

      // Fetch user stats
      const fetchStats = async () => {
        try {
          const data = await dataService.getUserStats(user.id);
          setStats(data);
        } catch (error) {
          console.error('Error fetching user stats:', error);
        }
      };
      
      fetchStats();
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = { ...formData };
      const currentPass = updates.currentPassword;
      delete updates.currentPassword;
      delete updates.confirmPassword;

      // Only update password if provided
      if (formData.password || formData.confirmPassword || currentPass) {
        if (!currentPass) {
          throw new Error('Debes ingresar tu contraseña actual para realizar cambios');
        }
        if (formData.password !== formData.confirmPassword) {
           throw new Error('Las nuevas contraseñas no coinciden');
        }
        if (!formData.password) {
           // User typed current password but no new password - assume they don't want to change it?
           // Or should we allow changing other details if current password is provided?
           // For now, if they provided currentPass but no new password, we just don't send password update
           delete updates.password;
        }
      } else {
        // No password fields touched
        delete updates.password;
      }
      
      await updateUser(updates, currentPass);
      setIsEditing(false);
      // Clear password fields after save
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '', currentPassword: '' }));
      showAlert('Perfil actualizado correctamente', 'Éxito', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert(error.message, 'Error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data
    setFormData({
      full_name: user.full_name || '',
      username: user.username || '',
      email: user.email || '',
      avatar_url: user.avatar_url || '',
      password: '',
      confirmPassword: '',
      currentPassword: ''
    });
  };

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await showConfirm(
      '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer y perderás todos tus eventos y datos.',
      'Eliminar Cuenta',
      { status: 'error', confirmText: 'Eliminar Definitivamente', cancelText: 'Cancelar' }
    );

    if (confirmed) {
      setLoading(true);
      try {
        await dataService.deleteUser(user.id);
        signOut();
        navigate('/login');
        showAlert('Cuenta eliminada correctamente', 'Adiós', 'success');
      } catch (error) {
        console.error('Error al eliminar cuenta:', error);
        showAlert(error.message, 'Error', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 z-10 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md">
        <button 
          onClick={handleBack}
          className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mi Perfil</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <div className="flex flex-col items-center pt-8 pb-8">
          {/* Avatar */}
          <div className="relative mb-6">
            <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold overflow-hidden shadow-xl ring-4 ring-white dark:ring-surface-dark">
              {formData.avatar_url && formData.avatar_url.startsWith('http') ? (
                <img src={formData.avatar_url} alt={formData.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-5xl">
                  {formData.avatar_url || 'account_circle'}
                </span>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="w-full max-w-xs text-center space-y-3 mb-6">
              <div>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white font-bold text-center text-xl border-none focus:ring-2 focus:ring-primary"
                  placeholder="Nombre Completo"
                />
              </div>
              <div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">@</span>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full pl-8 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 font-medium text-center border-none focus:ring-2 focus:ring-primary"
                    placeholder="usuario"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 text-center">
                {user.full_name}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">
                @{user.username}
              </p>
            </>
          )}

          <div className="w-full max-w-sm space-y-4">
            {/* Info Cards */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-4">
                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</p>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full mt-1 px-3 py-1 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white font-medium border-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  ) : (
                    <p className="text-slate-900 dark:text-white font-medium">{user.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <span className="material-symbols-outlined">lock</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contraseña</p>
                  {isEditing ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <input
                          type="password"
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleChange}
                          placeholder="Contraseña actual"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white font-medium border-none focus:ring-2 focus:ring-primary text-sm placeholder:text-slate-400 placeholder:font-normal"
                        />
                        <p className="text-[10px] text-slate-400 mt-1 ml-1">Requerida para cambiar contraseña</p>
                      </div>

                      {formData.currentPassword && (
                        <div className="space-y-3 animate-in slide-in-from-top-2">
                          <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Nueva contraseña"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white font-medium border-none focus:ring-2 focus:ring-primary text-sm placeholder:text-slate-400 placeholder:font-normal"
                          />
                          <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirmar nueva contraseña"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white font-medium border-none focus:ring-2 focus:ring-primary text-sm placeholder:text-slate-400 placeholder:font-normal"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-900 dark:text-white font-medium">••••••••</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <span className="material-symbols-outlined">calendar_month</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Miembro desde</p>
                  <p className="text-slate-900 dark:text-white font-medium">
                    {new Date(user.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Family Group Navigation */}
            <button 
              onClick={() => navigate('/family-group')}
              className="w-full bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group text-left"
            >
              <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">group</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">Grupo Familiar</p>
                <p className="text-xs text-slate-500 font-medium">Gestionar miembros y permisos</p>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
            </button>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => navigate('/completed-tasks')}
                className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 text-center hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
              >
                <span className="material-symbols-outlined text-primary mb-2 text-2xl group-hover:scale-110 transition-transform">check_circle</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completedTasks}</p>
                <p className="text-xs text-slate-500 font-medium group-hover:text-primary transition-colors">Tareas Completadas</p>
              </button>
              <button 
                onClick={() => navigate('/')}
                className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 text-center hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group"
              >
                <span className="material-symbols-outlined text-orange-500 mb-2 text-2xl group-hover:scale-110 transition-transform">event</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.upcomingEvents}</p>
                <p className="text-xs text-slate-500 font-medium group-hover:text-primary transition-colors">Ver Agenda</p>
              </button>
            </div>

            {/* Actions */}
            <div className="pt-4 space-y-3">
              {isEditing ? (
                <div className="flex gap-3">
                  <button 
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 py-4 px-6 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 py-4 px-6 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="size-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">save</span>
                        Guardar
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-full py-4 px-6 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">edit</span>
                  Editar Perfil
                </button>
              )}
              
              {!isEditing && (
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 px-6 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">logout</span>
                  Cerrar Sesión
                </button>
              )}

              {!isEditing && (
                <button 
                  onClick={handleDeleteAccount}
                  className="w-full py-4 px-6 bg-red-50 dark:bg-red-900/10 text-red-500 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 mt-4"
                >
                  <span className="material-symbols-outlined">delete_forever</span>
                  Eliminar Cuenta
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
