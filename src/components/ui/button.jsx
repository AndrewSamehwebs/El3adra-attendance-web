export function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`px-4 py-2 bg-red-700 text-white rounded-xl hover:bg-red-800 transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
