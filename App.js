import React from 'react';
import { View, StyleSheet } from 'react-native';
import RootNavigator from './navigation/RootNavigator';
import { UserProvider } from './contexts/UserContext';

export default function App() {
  return (
    <View style={styles.appContainer}>
      <UserProvider>
        <RootNavigator />
      </UserProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#000', // fondo negro global para prevenir destellos
  },
});
