import React from 'react';

/**
 * Skeleton card — mimics overview/metric cards.
 * @param {number} height - Height in px (default 100)
 * @param {string} className - Additional classes
 */
const SkeletonCard = ({ height = 100, className = '' }) => (
  <div
    className={`relative overflow-hidden bg-gray-100 rounded-2xl border border-gray-100/80 ${className}`}
    style={{ height }}
  >
    <div className="p-4 md:p-5 space-y-3">
      <div className="h-3 w-24 bg-gray-200 rounded" />
      <div className="h-6 w-32 bg-gray-200 rounded" />
    </div>
    <div className="absolute inset-0 bg-shimmer animate-shimmer" />
  </div>
);

export default SkeletonCard;
