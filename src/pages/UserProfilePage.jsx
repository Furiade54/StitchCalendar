import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { dataService } from '../services/dataService';
import { storageService } from '../services/storageService';
import { COUNTRIES, COUNTRY_NAME_BY_CODE } from '../utils/countries';

const UserProfilePage = () => {
  const { user, signOut, updateUser } = useAuth();
  const { showAlert, showConfirm } = useFeedback();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = React.useRef(null);
  const [stats, setStats] = useState({ completedTasks: 0, upcomingEvents: 0 });
  const [tempAvatarPath, setTempAvatarPath] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    avatar_url: '',
    country: '',
    password: '',
    confirmPassword: '',
    currentPassword: ''
  });

  // Update form data when user changes, but only if not editing to avoid overwriting inputs
  useEffect(() => {
    if (user && !isEditing) {
      let avatarCandidate = user.avatar_url || '';
      if (avatarCandidate && !avatarCandidate.startsWith('http') && avatarCandidate.includes('/')) {
        const maybe = storageService.getPublicUrl(avatarCandidate);
        if (maybe) avatarCandidate = maybe;
      }
      setFormData({
        full_name: user.full_name || '',
        username: user.username || '',
        email: user.email || '',
        avatar_url: avatarCandidate || '',
        country: user.country || '',
        password: '',
        confirmPassword: '',
        currentPassword: ''
      });
      setImgError(false);
    }
  }, [user, isEditing]);

  // Fetch user stats separately to avoid unnecessary re-fetches
  useEffect(() => {
    if (user?.id) {
      let mounted = true;
      const fetchStats = async () => {
        try {
          const data = await dataService.getUserStats(user.id);
          if (mounted) {
            setStats(data);
          }
        } catch (error) {
          console.error('Error fetching user stats:', error);
        }
      };
      
      fetchStats();
      
      return () => {
        mounted = false;
      };
    }
  }, [user?.id]);

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
      const prevUrl = user?.avatar_url || null;
      await updateUser(updates, currentPass);
      if (tempAvatarPath && prevUrl) {
        const prevPath = prevUrl.startsWith('http')
          ? storageService.extractPathFromPublicUrl(prevUrl)
          : prevUrl;
        if (prevPath && prevPath !== tempAvatarPath) {
          storageService.deleteFile(prevPath).catch(() => {});
        }
      }
      setTempAvatarPath(null);
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
    if (tempAvatarPath) {
      storageService.deleteFile(tempAvatarPath).catch(() => {});
      setTempAvatarPath(null);
    }
    // Reset form data
    setFormData({
      full_name: user.full_name || '',
      username: user.username || '',
      email: user.email || '',
      avatar_url: user.avatar_url || '',
      country: user.country || '',
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

  const handleFileClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation
    if (!file.type.startsWith('image/')) {
      showAlert('Por favor selecciona un archivo de imagen válido', 'Error', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
      showAlert('La imagen no debe superar los 5MB', 'Error', 'error');
      return;
    }

    setUploading(true);
    setImgError(false);
    try {
      const { publicUrl, path } = await storageService.uploadAvatar(file, user.id);
      console.log('Avatar uploaded, public URL:', publicUrl);
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      setTempAvatarPath(path);
      showAlert('Imagen subida correctamente', 'Éxito', 'success');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showAlert(error?.message || 'Error al subir la imagen', 'Error', 'error');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    return () => {
      if (tempAvatarPath) {
        storageService.deleteFile(tempAvatarPath).catch(() => {});
      }
    };
  }, [tempAvatarPath]);

  const getMemberSinceLabel = () => {
    if (!user) return null;
    const source = user.created_at;
    if (!source) return null;
    const d = new Date(source);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
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
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
          />
          <div className="relative mb-6">
            <div 
              onClick={handleFileClick}
              className={`size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold overflow-hidden shadow-xl ring-4 ring-white dark:ring-surface-dark relative ${isEditing ? 'cursor-pointer hover:opacity-90' : ''} transition-all`}
            >
              {uploading ? (
                 <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                    <div className="size-8 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                 </div>
              ) : null}
              
              {formData.avatar_url && formData.avatar_url.startsWith('http') && !imgError ? (
                <img 
                  src={formData.avatar_url} 
                  alt={formData.full_name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    console.error('[PROFILE_AVATAR] Image load FAILED', { url: formData.avatar_url, error: e?.message });
                    setImgError(true);
                  }}
                />
              ) : (
                <span className="material-symbols-outlined text-5xl">
                  {formData.avatar_url && !formData.avatar_url.startsWith('http') ? formData.avatar_url : 'account_circle'}
                </span>
              )}
              
              {isEditing && !uploading && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                </div>
              )}
            </div>
            {isEditing && (
              <button 
                onClick={handleFileClick}
                className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:bg-primary-dark transition-colors z-10"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            )}
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
                  <span className="material-symbols-outlined">public</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">País</p>
                  {isEditing ? (
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white font-medium border-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="">Selecciona un país</option>
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-slate-900 dark:text-white font-medium">
                      {COUNTRY_NAME_BY_CODE[user.country] || '—'}
                    </p>
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
                    {getMemberSinceLabel() || '—'}
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
                <span className="material-symbols-outlined text-primary mb-2 text-2xl group-hover:scale-110 transition-transform">event_busy</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completedTasks}</p>
                <p className="text-xs text-slate-500 font-medium group-hover:text-primary transition-colors">Eventos Vencidos</p>
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
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
