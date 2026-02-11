import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { USERS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loggingIn, setLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email || !password) {
      setError('Por favor ingresa correo y contraseña');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (isRegistering) {
      if (!fullName) {
        setError('Por favor ingresa tu nombre completo');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
    }

    setLoggingIn(true);
    try {
      if (isRegistering) {
        await signUp({ email, password, full_name: fullName });
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      if (error.message === 'Usuario no encontrado' && !isRegistering) {
        // Show prompt instead of switching immediately
        setShowRegistrationPrompt(true);
      } else {
        console.error('Auth failed:', error);
        setError(error.message);
      }
      setLoggingIn(false);
    }
  };

  const handleCreateAccountConfirm = () => {
    setShowRegistrationPrompt(false);
    setIsRegistering(true);
    setInfoMessage('Completa los datos para crear una nueva cuenta.');
    // Pre-fill name from email part if possible to be helpful
    setFullName(email.split('@')[0]);
  };

  const handleCreateAccountCancel = () => {
    setShowRegistrationPrompt(false);
    // Focus email field
    const emailInput = document.getElementById('email-input');
    if (emailInput) emailInput.focus();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark p-6 relative">
      
      {/* Registration Prompt Modal */}
      {showRegistrationPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="size-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
              ¿Crear cuenta nueva?
            </h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-6">
              No encontramos una cuenta con el correo <strong>{email}</strong>. ¿Quieres crear una ahora?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCreateAccountCancel}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAccountConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
              >
                Sí, crear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-3xl shadow-xl p-8 animate-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <span className="material-symbols-outlined text-3xl">calendar_month</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            {isRegistering ? 'Crear cuenta' : 'Bienvenido de nuevo'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {isRegistering ? 'Completa tus datos para unirte' : 'Ingresa tus credenciales para continuar'}
          </p>
        </div>

        {infoMessage && (
          <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
            <span className="material-symbols-outlined text-lg">info</span>
            {infoMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div className="animate-in slide-in-from-top-4 fade-in duration-300">
              <label htmlFor="full-name-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Nombre Completo
              </label>
              <input
                id="full-name-input"
                name="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Tu Nombre"
                autoFocus
              />
            </div>
          )}

          <div>
            <label htmlFor="email-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <input
              id="email-input"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <input
              id="password-input"
              name="password"
              type="password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="••••••••"
            />
          </div>

          {isRegistering && (
            <div className="animate-in slide-in-from-top-4 fade-in duration-300">
              <label htmlFor="confirm-password-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Confirmar Contraseña
              </label>
              <input
                id="confirm-password-input"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loggingIn ? (
              <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
            {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
          </p>
          <button
            onClick={() => {
              if (isRegistering) {
                setIsRegistering(false);
                setInfoMessage(null);
                setError(null);
              } else {
                navigate('/register');
              }
            }}
            className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">person_add</span>
            Crear nueva cuenta
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
