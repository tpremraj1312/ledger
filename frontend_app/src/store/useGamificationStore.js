import { create } from 'zustand';

export const useGamificationStore = create((set, get) => ({
    xp: 0,
    level: 1,
    badges: [],
    toasts: [],
    
    // Core actions
    setProfile: (profile) => set({
        xp: profile.xp,
        level: profile.level,
        badges: profile.badges,
    }),

    // Process gamification results returning from ANY API call
    processResults: (results) => {
        if (!results) return;

        const xpGained = results.xpGained || results.awarded || 0;
        const { badgesUnlocked = [] } = results;
        
        if (xpGained > 0) {
            get().addToast({
                id: Date.now().toString() + Math.random(),
                type: 'xp',
                message: `⚡ +${xpGained} XP earned!`
            });
            set((state) => {
                const newXP = state.xp + xpGained;
                const newLevel = Math.floor(newXP / 500) + 1;
                
                if (newLevel > state.level) {
                    get().addToast({
                        id: Date.now().toString() + Math.random(),
                        type: 'level_up',
                        message: `🎉 Level Up! You're now Level ${newLevel}!`
                    });
                }
                
                return { xp: newXP, level: Math.max(state.level, newLevel) };
            });
        }
        
        if (badgesUnlocked && badgesUnlocked.length > 0) {
            badgesUnlocked.forEach(badgeName => {
                get().addToast({
                    id: Date.now().toString() + Math.random(),
                    type: 'badge',
                    message: `🏅 Badge Unlocked: ${badgeName}!`
                });
            });
        }
    },

    // Toast Queue Management
    addToast: (toast) => set((state) => ({ toasts: [...state.toasts, toast] })),
    removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }))
}));
