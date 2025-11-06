import * as React from 'react';
import { Link, useLocation } from 'react-router';
import { useDrawerStore } from '../../stores/drawerStore';

const AppBar: React.FC = () => {
  const toggleDrawer = useDrawerStore(state => state.toggle);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

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

      {/* Navigation Section */}
      <nav className="flex items-center gap-6 ml-8">
        <Link
          to="/designer"
          className={`px-3 py-2 rounded-md transition-colors ${
            isActive('/designer')
              ? 'bg-gray-700 text-white font-medium'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          设计器
        </Link>
        <Link
          to="/library"
          className={`px-3 py-2 rounded-md transition-colors ${
            isActive('/library')
              ? 'bg-gray-700 text-white font-medium'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          型材库
        </Link>
      </nav>

      {/* Status Section (Right-aligned) */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Notification Button */}
        <button
          className="p-2 hover:bg-gray-700 rounded-md transition-colors"
          aria-label="Notifications"
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
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>

        {/* Settings Button */}
        <button
          className="p-2 hover:bg-gray-700 rounded-md transition-colors"
          aria-label="Settings"
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
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        {/* Profile Button */}
        <button
          className="p-2 hover:bg-gray-700 rounded-md transition-colors"
          aria-label="Profile"
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AppBar;
