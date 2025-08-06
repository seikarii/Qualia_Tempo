import React from 'react';

interface MenuContainerProps {
  children: React.ReactNode;
  title?: string;
}

export const MenuContainer: React.FC<MenuContainerProps> = ({ children, title }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white',
      fontSize: '24px',
      zIndex: 2000,
    }}>
      {title && <h1>{title}</h1>}
      {children}
    </div>
  );
};
