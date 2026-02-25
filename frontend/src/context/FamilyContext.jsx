import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from "react";
import {
    getMyGroup,
    getFamilyFinancialContext,
} from "../services/familyService";
import { useAuth } from "./authContext";

const FamilyContext = createContext();

export const useFamily = () => {
    const context = useContext(FamilyContext);
    if (!context) {
        throw new Error("useFamily must be used within FamilyProvider");
    }
    return context;
};

export const FamilyProvider = ({ children }) => {
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [familyFinancialData, setFamilyFinancialData] = useState(null);
    const [financialLoading, setFinancialLoading] = useState(false);

    const { user, isAuthenticated } = useAuth();

    // Derive family membership from user's currentFamilyId — single source of truth
    const currentFamilyId = user?.currentFamilyId || null;

    const refreshGroup = useCallback(async () => {
        if (!isAuthenticated || !currentFamilyId) {
            setGroup(null);
            setLoading(false);
            return;
        }

        try {
            const data = await getMyGroup();
            const newGroup = data?.group || null;

            setGroup(prev => {
                if (JSON.stringify(prev) === JSON.stringify(newGroup)) return prev;
                return newGroup;
            });
        } catch (err) {
            console.error("Failed to load family group:", err);
            setGroup(null);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, currentFamilyId]);

    const refreshFamilyFinancialData = useCallback(
        async (filters = {}) => {
            if (!currentFamilyId || !isAuthenticated) return;

            setFinancialLoading(true);
            try {
                const data = await getFamilyFinancialContext(filters);
                setFamilyFinancialData(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                    return data;
                });
            } catch (err) {
                console.error("Failed to load family financial data:", err);
            } finally {
                setFinancialLoading(false);
            }
        },
        [isAuthenticated, currentFamilyId]
    );

    // Initial Load — only fetch if user has a family
    useEffect(() => {
        if (isAuthenticated && currentFamilyId) {
            refreshGroup();
        } else {
            setGroup(null);
            setFamilyFinancialData(null);
            setLoading(false);
        }
    }, [refreshGroup, isAuthenticated, currentFamilyId]);

    // Fetch Financial Data When Group loads
    useEffect(() => {
        if (group?._id && isAuthenticated) {
            refreshFamilyFinancialData();
        }
    }, [group?._id, refreshFamilyFinancialData, isAuthenticated]);

    const currentUserMember = useMemo(() => {
        if (!group?.members || !user?._id) return null;
        return group.members.find((m) => {
            const uid = m.user?._id || m.user;
            return uid?.toString() === user._id?.toString();
        });
    }, [group, user]);

    const value = useMemo(
        () => ({
            group,
            loading,
            members: group?.members || [],
            myRole: currentUserMember?.role || null,
            isAdmin: currentUserMember?.role === "ADMIN",
            isMember: currentUserMember?.role === "MEMBER",
            isViewer: currentUserMember?.role === "VIEWER",
            hasGroup: !!group && !!currentFamilyId,
            currentFamilyId,
            familyFinancialData,
            financialLoading,
            refreshGroup,
            refreshFamilyFinancialData,
        }),
        [group, loading, currentUserMember, currentFamilyId, familyFinancialData, financialLoading, refreshGroup, refreshFamilyFinancialData]
    );

    return (
        <FamilyContext.Provider value={value}>
            {children}
        </FamilyContext.Provider>
    );
};