import React from 'react';

/**
 * Skeleton table — multiple rows of grey bars.
 * @param {number} rows - Number of skeleton rows (default 5)
 * @param {number} cols - Number of columns per row (default 4)
 * @param {string} className - Additional classes
 */
const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {/* Header row */}
    <div className="relative overflow-hidden flex gap-4 p-3 bg-gray-100 rounded-lg">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-3 flex-1 bg-gray-200 rounded" />
      ))}
      <div className="absolute inset-0 bg-shimmer animate-shimmer" />
    </div>
    {/* Data rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        key={rowIdx}
        className="relative overflow-hidden flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100"
      >
        {Array.from({ length: cols }).map((_, colIdx) => (
          <div
            key={colIdx}
            className="h-3 bg-gray-200 rounded"
            style={{ flex: colIdx === 0 ? 2 : 1 }}
          />
        ))}
        <div className="absolute inset-0 bg-shimmer animate-shimmer" />
      </div>
    ))}
  </div>
);

export default SkeletonTable;
