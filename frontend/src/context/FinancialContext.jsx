// src/context/FinancialContext.jsx

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";

import { fetchFinancialContext } from "../services/financialContextService"; // ✅ FIXED IMPORT

const FinancialContext = createContext();

export const useFinancial = () => {
    const context = useContext(FinancialContext);
    if (!context) {
        throw new Error("useFinancial must be used within FinancialProvider");
    }
    return context;
};

export const FinancialProvider = ({ children }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filters, setFilters] = useState({
        period: "Monthly",
        startDate: "",
        endDate: "",
    });

    // Prevent double fetch in StrictMode
    const hasFetched = useRef(false);

    const abortControllerRef = useRef(null);

    const refreshData = useCallback(
        async (force = false) => {
            const token = localStorage.getItem("token");
            if (!token) {
                setLoading(false);
                return;
            }

            if (!force && hasFetched.current) return;

            // Cancel any pending request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            setLoading(true);

            try {
                // Pass signal to the service (needs update in service too)
                const contextData = await fetchFinancialContext(filters, abortControllerRef.current.signal);

                setData((prev) => {
                    if (JSON.stringify(prev) === JSON.stringify(contextData)) {
                        return prev;
                    }
                    return contextData;
                });

                setError(null);
                hasFetched.current = true;
            } catch (err) {
                if (err.name === 'CanceledError' || err.name === 'AbortError') {
                    console.log("Fetch aborted");
                    return;
                }
                console.error("Failed to fetch financial context:", err);
                setError(err.message || "Failed to load financial data");
            } finally {
                setLoading(false);
            }
        },
        [filters]
    );

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const updateFilters = useCallback((newFilters) => {
        setFilters((prev) => {
            const updated = { ...prev, ...newFilters };

            if (JSON.stringify(prev) === JSON.stringify(updated)) {
                return prev;
            }

            // --- DEEP VALIDATION FIX: Reset state immediately to prevent stale data view ---
            setData(null);
            setLoading(true);
            hasFetched.current = false;
            return updated;
        });
    }, []);

    const value = useMemo(
        () => ({
            data,
            loading,
            error,
            filters,
            updateFilters,
            refreshData: () => refreshData(true),

            totals: data
                ? {
                    income: data.totalIncome || 0,
                    expenses: data.totalExpense || 0,
                    savings: data.netSavings || 0,
                    nonEssential: data.nonEssential || 0,
                    budgetUsage: data.budgetUsage || 0,
                }
                : {
                    income: 0,
                    expenses: 0,
                    savings: 0,
                    nonEssential: 0,
                    budgetUsage: 0,
                },
        }),
        [data, loading, error, filters, updateFilters, refreshData]
    );

    return (
        <FinancialContext.Provider value={value}>
            {children}
        </FinancialContext.Provider>
    );
};