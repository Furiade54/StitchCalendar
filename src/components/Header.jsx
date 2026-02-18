import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';

const Header = ({ currentDate, onMenuClick, selectedMemberId, onMemberSelect, onNotificationsClick, notificationCount = 0 }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isFamilyMenuOpen, setIsFamilyMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      dataService.getFamilyMembers(user.id).then(setFamilyMembers);
    } else {
      setFamilyMembers([]);
    }
  }, [user]);

  const handleMemberClick = (id) => {
    if (onMemberSelect) {
      onMemberSelect(id);
    }
    setIsFamilyMenuOpen(false);
  };

  // Combine members and user for the list
  const allMembers = [...familyMembers];
  if (user) {
      // Ensure user is in the list (or handled separately if preferred, but combining is easier for selection)
      // Check if user is already in list to avoid dupes (though usually getFamilyMembers excludes self)
      if (!allMembers.find(m => m.id === user.id)) {
          allMembers.push({ ...user, full_name: 'Yo', isMe: true });
      }
  }

  // Find active member for display
  const activeMember = allMembers.find(m => m.id === selectedMemberId) || (user ? { ...user, full_name: 'Yo', isMe: true } : null);

  return (
    <header className="flex items-center justify-between px-4 py-4 z-10 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md">
      <button 
        onClick={onMenuClick}        className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
      >
        <span className="material-symbols-outlined text-primary">menu</span>
      </button>
      
      <div className="flex items-center gap-2">
        {(allMembers.length > 0) && (
          <>
            <button 
              onClick={() => setIsFamilyMenuOpen(true)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-transparent hover:bg-slate-100 dark:hover:bg-white/10 transition-all focus:outline-none active:scale-95 group"
            >
              <div className="relative size-[28px] flex items-center justify-center rounded-full overflow-hidden">
                {activeMember?.avatar_url && (activeMember.avatar_url.startsWith('http') || activeMember.avatar_url.startsWith('/')) ? (
                  <img src={activeMember.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-primary text-[28px]">
                    {activeMember?.avatar_url || 'account_circle'}
                  </span>
                )}
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center size-4 shadow-sm z-10">
                  <span className="material-symbols-outlined text-[10px] text-primary">expand_more</span>
                </div>
              </div>
            </button>

            {isFamilyMenuOpen && typeof document !== 'undefined' &&
              createPortal(
                (
                  <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsFamilyMenuOpen(false)}
                  >
                    <div 
                      className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-primary/5 dark:bg-primary/10 px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
                        <div>
                          <h3 className="text-base font-bold text-primary">Ver calendario de</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Selecciona el miembro cuyo calendario quieres ver
                          </p>
                        </div>
                        <button 
                          onClick={() => setIsFamilyMenuOpen(false)}
                          className="size-9 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                      <div className="p-3 space-y-1 max-h-[320px] overflow-y-auto">
                        {allMembers.map(member => {
                          const isSelected = selectedMemberId === member.id || (member.isMe && selectedMemberId === user?.id);
                          return (
                            <button
                              key={member.id}
                              onClick={() => handleMemberClick(member.id)}
                              className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${
                                isSelected 
                                  ? 'bg-primary/10 text-primary' 
                                  : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <div className="size-6 flex items-center justify-center rounded-full overflow-hidden flex-shrink-0">
                                {member.avatar_url && (member.avatar_url.startsWith('http') || member.avatar_url.startsWith('/')) ? (
                                  <img src={member.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="material-symbols-outlined text-2xl">
                                    {member.avatar_url || 'account_circle'}
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-medium truncate flex-1 text-left">
                                {member.isMe ? 'Yo' : member.full_name.split(' ')[0]}
                              </span>
                              {isSelected && <span className="material-symbols-outlined text-sm">check</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ),
                document.body
              )
            }
          </>
        )}

        <button 
          onClick={toggleTheme}
          className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Cambiar tema"
          title="Cambiar tema"
        >
          <span className={`material-symbols-outlined text-primary transition-all duration-300 ${theme === 'dark' ? 'rotate-180' : 'rotate-0'}`}>
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        <button className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-primary">search</span>
        </button>
        <button 
          onClick={onNotificationsClick}
          className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors relative"
        >
          <span className={`material-symbols-outlined ${notificationCount > 0 ? 'filled-icon text-primary' : 'text-primary'}`}>notifications</span>
          {notificationCount > 0 && (
            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
