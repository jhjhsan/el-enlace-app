import React from 'react';
import { SafeAreaView, StyleSheet, StatusBar, Platform } from 'react-native';
import RootNavigator from './navigation/RootNavigator';
import { UserProvider } from './contexts/UserContext';

export default function App() {
  return (
    <UserProvider>
      <SafeAreaView style={styles.container}>
        <RootNavigator />
      </SafeAreaView>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});
