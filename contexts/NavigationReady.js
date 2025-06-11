import React, { createContext, useContext, useState } from 'react';

const NavigationReadyContext = createContext();

export const NavigationReadyProvider = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  return (
    <NavigationReadyContext.Provider value={{ isReady, setIsReady }}>
      {children}
    </NavigationReadyContext.Provider>
  );
};

export const useNavigationReady = () => useContext(NavigationReadyContext);
