import { createBrowserRouter } from 'react-router';
import App from './App.tsx';
import BaseLayout from './layouts/BaseLayout.tsx';
import DesignerPage from './pages/DesignerPage.tsx';
import LibraryPage from './pages/LibraryPage.tsx';

export const routes = createBrowserRouter([
  {
    index: true,
    Component: App,
  },
  {
    Component: BaseLayout,
    children: [
      {
        path: '/designer',
        Component: DesignerPage,
      },
      {
        path: '/library',
        Component: LibraryPage,
      },
    ],
  },
]);
