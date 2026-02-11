import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';

const CompletedTasksPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      if (user) {
        try {
          const data = await dataService.getCompletedEvents(user.id);
          setTasks(data);
        } catch (error) {
          console.error('Error fetching completed tasks:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchTasks();
  }, [user]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 z-10 sticky top-0 bg-white dark:bg-surface-dark shadow-sm border-b border-slate-100 dark:border-slate-800">
        <button 
          onClick={() => navigate(-1)}
          className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tareas Completadas</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-400">task_alt</span>
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No hay tareas completadas</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-[200px]">Las tareas que marques como completadas aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {tasks.map(task => (
              <div 
                key={task.id}
                onClick={() => navigate(`/event/${task.id}`)}
                className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className={`size-12 rounded-full flex items-center justify-center flex-shrink-0 ${task.iconBgClass || 'bg-slate-100'} ${task.colorClass || 'text-slate-500'}`}>
                  <span className="material-symbols-outlined text-xl">check</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white truncate decoration-slate-400">
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                    <span className="capitalize">{formatDate(task.startDate)}</span>
                  </div>
                </div>

                <span className="material-symbols-outlined text-slate-300">chevron_right</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompletedTasksPage;
