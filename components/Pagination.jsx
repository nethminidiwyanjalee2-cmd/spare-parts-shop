'use client';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 20,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600 pagination-bar">
      <div className="text-sm text-gray-700 pagination-summary">
        Showing <span className="font-semibold text-gray-900">{start}</span> to{' '}
        <span className="font-semibold text-gray-900">{end}</span> of{' '}
        <span className="font-semibold text-gray-900">{totalItems}</span> entries
      </div>

      <div className="inline-flex items-center gap-3 pagination-controls">
        <button
          type="button"
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors pagination-btn btn btn-sm btn-secondary"
        >
          Previous
        </button>

        <span className="text-sm font-medium text-gray-700 pagination-counter">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors pagination-btn btn btn-sm btn-secondary"
        >
          Next
        </button>
      </div>
    </div>
  );
}
