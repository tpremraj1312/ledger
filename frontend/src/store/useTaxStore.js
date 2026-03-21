import { create } from 'zustand';

export const useTaxStore = create((set, get) => ({
    previousTax: null,
    optimizationScore: 0,
    toasts: [],
    
    // Process tax results returning from any API call
    processTaxResults: (results) => {
        if (!results) return;

        const { oldRegimeTax, newRegimeTax, taxOptimizationScore } = results;
        const currentBestTax = Math.min(oldRegimeTax, newRegimeTax);

        set((state) => {
            // Check if tax dropped
            if (state.previousTax !== null && currentBestTax < state.previousTax) {
                const dropAmount = state.previousTax - currentBestTax;
                // Add a toast if the drop is somewhat significant (e.g. > 0)
                if (dropAmount > 0) {
                    get().addToast({
                        id: Date.now().toString() + Math.random(),
                        type: 'tax_drop',
                        message: `📉 Tax Liability reduced by ₹${dropAmount.toLocaleString('en-IN')}!`,
                        amount: dropAmount
                    });
                }
            }

            // Check if score increased significantly
            if (state.optimizationScore > 0 && taxOptimizationScore > state.optimizationScore) {
                get().addToast({
                    id: Date.now().toString() + Math.random(),
                    type: 'tax_score',
                    message: `🚀 Tax Optimization Score increased to ${taxOptimizationScore}!`,
                    score: taxOptimizationScore
                });
            }

            return {
                previousTax: currentBestTax,
                optimizationScore: taxOptimizationScore
            };
        });
    },

    // Toast Queue Management
    addToast: (toast) => set((state) => ({ toasts: [...state.toasts, toast] })),
    removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }))
}));
