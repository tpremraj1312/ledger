import React from 'react';

/**
 * Skeleton text block — multiple lines of varying width.
 * @param {number} lines - Number of text lines (default 3)
 * @param {string} className - Additional classes
 */
const SkeletonText = ({ lines = 3, className = '' }) => {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3'];
  return (
    <div className={`relative overflow-hidden space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 bg-gray-200 rounded ${widths[i % widths.length]}`}
        />
      ))}
      <div className="absolute inset-0 bg-shimmer animate-shimmer" />
    </div>
  );
};

export default SkeletonText;
