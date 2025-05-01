import React from 'react';
import RootNavigator from './navigation/RootNavigator';
import { UserProvider } from './contexts/UserContext'; // 👈 esto es clave

export default function App() {
  return (
    <UserProvider>
      <RootNavigator />
    </UserProvider>
  );
}
