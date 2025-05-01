// navigation/AppNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationScreen from '../screens/NotificationScreen';
import PublishScreen from '../screens/PublishScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import MenuScreen from '../screens/MenuScreen';
import ExploreProfilesScreen from '../screens/ExploreProfilesScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import PublishMenuScreen from '../screens/PublishMenuScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Dashboard" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="Publish" component={PublishScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      <Stack.Screen name="Menu" component={MenuScreen} />
      <Stack.Screen name="ExploreProfiles" component={ExploreProfilesScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="PublishMenu" component={PublishMenuScreen} />
    </Stack.Navigator>
  );
}
