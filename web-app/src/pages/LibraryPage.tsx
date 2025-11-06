import * as React from 'react';
import LibraryToolbar from '../components/toolbar/LibraryToolbar.tsx';
import { useAssetsLibrary } from '../features/library/hooks/useAssetsLibrary.ts';

const LibraryPage: React.FC = () => {
  const {assets, add, update, remove} = useAssetsLibrary();
  return (
    <div className="library-page p-4 ">
      <LibraryToolbar />
      <div className="page-content">
        {assets.map((asset) => )}
      </div>
    </div>
  );
};

export default LibraryPage;
