import * as React from 'react';
import { useDrawerStore } from '../../stores/drawerStore';

const AppBar: React.FC = () => {
  const toggleDrawer = useDrawerStore(state => state.toggle);

  return (
    <div className="app-bar bg-gray-800 text-white p-4 flex items-center gap-4 shadow-md z-10">
      <button
        onClick={toggleDrawer}
        className="p-2 hover:bg-gray-700 rounded-md transition-colors"
        aria-label="Toggle drawer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <h1 className="text-lg font-semibold">My Application</h1>
    </div>
  );
};

export default AppBar;
