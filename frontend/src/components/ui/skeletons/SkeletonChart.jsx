import React from 'react';

/**
 * Skeleton chart — grey rectangular placeholder for charts.
 * @param {number} height - Height in px (default 300)
 * @param {string} className - Additional classes
 */
const SkeletonChart = ({ height = 300, className = '' }) => (
  <div
    className={`relative overflow-hidden bg-gray-100 rounded-xl ${className}`}
    style={{ height }}
  >
    {/* Fake axis lines */}
    <div className="absolute left-8 top-4 bottom-8 w-px bg-gray-200" />
    <div className="absolute left-8 right-4 bottom-8 h-px bg-gray-200" />
    {/* Fake bars */}
    <div className="absolute bottom-8 left-12 right-8 flex items-end gap-3 h-3/4 px-2">
      {[60, 80, 45, 90, 55, 70, 40].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-gray-200 rounded-t"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
    <div className="absolute inset-0 bg-shimmer animate-shimmer" />
  </div>
);

export default SkeletonChart;
