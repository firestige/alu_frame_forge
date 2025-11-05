import * as React from 'react';
import {Outlet} from "react-router";
import AppBar from "../components/appbar/AppBar.tsx";
import Footer from "../components/footer/Footer.tsx";

const BaseLayout: React.FC = () => {
  return (
    <div className="base-layout flex flex-col min-h-screen">
      <AppBar />
      <div className="flex flex-1">
        <main className="flex-1 p-4 bg-gray-100">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default BaseLayout;