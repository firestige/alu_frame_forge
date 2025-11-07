import * as React from 'react';
import type { ReactNode } from 'react';

const Toolbar: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="h-(--spacing-toolbar) px-4 bg-white border-b border-secondary-200 flex items-center">
      {children}
    </div>
  );
};

export default Toolbar;
