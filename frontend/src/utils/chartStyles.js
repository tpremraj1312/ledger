export const CHART_COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#6366F1', // Indigo
];

export const COMMON_AXIS_PROPS = {
    fontSize: 12,
    tick: { fill: '#6B7280' },
    axisLine: { stroke: '#E5E7EB' },
    tickLine: { stroke: '#E5E7EB' },
};

export const COMMON_TOOLTIP_PROPS = {
    contentStyle: {
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        padding: '12px',
    },
    itemStyle: {
        fontSize: '13px',
        fontWeight: '500',
    },
};

export const formatCurrencyCompact = (value) => {
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
    return `₹${value}`;
};

export const formatDateChart = (dateStr) => {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch (e) {
        return dateStr;
    }
};
