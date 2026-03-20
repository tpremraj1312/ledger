import React from 'react';

/**
 * Skeleton list — list items with optional avatar + text lines.
 * @param {number} count - Number of list items (default 5)
 * @param {boolean} showAvatar - Show circular avatar placeholder (default false)
 * @param {string} className - Additional classes
 */
const SkeletonList = ({ count = 5, showAvatar = false, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="relative overflow-hidden p-4 bg-gray-50/60 rounded-xl border border-gray-100"
      >
        <div className="flex items-center gap-3">
          {showAvatar && (
            <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/5 bg-gray-200 rounded" />
            <div className="h-2.5 w-4/5 bg-gray-200 rounded" />
            <div className="h-2 w-1/4 bg-gray-200 rounded" />
          </div>
          <div className="h-5 w-20 bg-gray-200 rounded self-start" />
        </div>
        <div className="absolute inset-0 bg-shimmer animate-shimmer" />
      </div>
    ))}
  </div>
);

export default SkeletonList;
