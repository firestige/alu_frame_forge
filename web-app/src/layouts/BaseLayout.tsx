import * as React from 'react';
import { Outlet } from 'react-router';
import AppBar from '../components/AppBar/AppBar.tsx';
import Footer from '../components/footer/Footer.tsx';

/**
 * BaseLayout - 基础布局组件
 * - AppBar 和 Footer 固定在顶部和底部
 * - Outlet 区域占据剩余空间，内容溢出时使用自定义滚动条
 */
const BaseLayout: React.FC = () => {
  return (
    <div className="base-layout flex flex-col h-screen overflow-hidden">
      {/* 固定顶部 AppBar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <AppBar />
      </div>

      {/* 主内容区域 - 占据 AppBar 和 Footer 之间的空间 */}
      <main
        className="flex-1 overflow-y-auto bg-secondary-50 scrollbar-hide"
        style={{
          marginTop: 'var(--spacing-appbar)',
          marginBottom: 'var(--spacing-toolbar)',
        }}
      >
        <Outlet />
      </main>

      {/* 固定底部 Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <Footer />
      </div>
    </div>
  );
};

export default BaseLayout;
