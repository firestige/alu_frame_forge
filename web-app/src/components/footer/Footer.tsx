import * as React from 'react';

const Footer: React.FC = () => {
  return (
    <div className="footer h-(--spacing-footer) bg-gray-800 text-white flex items-center justify-center shadow-inner">
      <p className="text-center text-sm">
        &copy; 2025 My Application. All rights reserved.
      </p>
    </div>
  );
};

export default Footer;
