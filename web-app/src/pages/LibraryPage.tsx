import * as React from 'react';
import LibraryToolbar from '../components/toolbar/LibraryToolbar.tsx';

const example20 = (
  <div className="flex flex-col">
    <div>
      <h3>20型材</h3>
    </div>
    <div className="flex flex-row flex-wrap gap-3">
      <div className="flex flex-col">
        <svg className="bg-amber-400 w-40 h-32" />
        <span>2020</span>
      </div>
      <div className="flex flex-col">
        <svg className="bg-amber-400 w-40 h-32" />
        <span>2020L</span>
      </div>
      <div className="flex flex-col">
        <svg className="bg-amber-400 w-40 h-32" />
        <span>2020W</span>
      </div>
      <div className="flex flex-col">
        <svg className="bg-amber-400 w-40 h-32" />
        <span>2040</span>
      </div>
      <div className="flex flex-col">
        <svg className="bg-amber-400 w-40 h-32" />
        <span>2060</span>
      </div>
      <div className="flex flex-col">
        <svg className="bg-amber-400 w-40 h-32" />
        <span>2020LE</span>
      </div>
    </div>
  </div>
);
const example30 = (
  <div className="flex flex-col">
    <div>
      <h3>30型材</h3>
    </div>
    <div className="flex flex-row flex-wrap gap-3">
      <div className="flex flex-col">
        <svg className="bg-amber-400 w-40 h-32" />
        <span>3030</span>
      </div>
      <div className="flex flex-col">
        <svg className="bg-amber-400 w-40 h-32" />
        <span>3030L</span>
      </div>
      <div className="flex flex-col">
        <svg className="bg-amber-400 w-40 h-32" />
        <span>3030W</span>
      </div>
      <div className="flex flex-col">
        <svg className="bg-amber-400 w-40 h-32" />
        <span>3040</span>
      </div>
      <div className="flex flex-col">
        <svg className="bg-amber-400 w-40 h-32" />
        <span>3060</span>
      </div>
      <div className="flex flex-col">
        <svg className="bg-amber-400 w-40 h-32" />
        <span>3030LE</span>
      </div>
    </div>
  </div>
);

const LibraryPage: React.FC = () => {
  return (
    <div className="library-page p-4 ">
      <LibraryToolbar />
      <div className="page-content flex flex-col gap-3">
        {example20}
        <div className="border-1" />
        {example30}
      </div>
    </div>
  );
};

export default LibraryPage;
