// navigation/AppNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationScreen from '../screens/NotificationScreen';
import PublishScreen from '../screens/PublishScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import CompleteFreeScreen from '../screens/CompleteFreeScreen'; // nuevo formulario
import MenuScreen from '../screens/MenuScreen';
import ExploreProfilesScreen from '../screens/ExploreProfilesScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import PublishMenuScreen from '../screens/PublishMenuScreen';
import ProfileProScreen from '../screens/ProfileProScreen';
import EditProfileFree from '../screens/EditProfileFree';
import FilteredProfilesScreen from '../screens/FilteredProfilesScreen';
import ProfileDetailScreen from '../screens/ProfileDetailScreen';
import ViewPostsScreen from '../screens/ViewPostsScreen';
import SupportScreen from '../screens/SupportScreen';
import ExplorePostsScreen from '../screens/ExplorePostsScreen';
import PromoteScreen from '../screens/PromoteScreen';
import PromoteProfileScreen from '../screens/PromoteProfileScreen';
import PromotePostScreen from '../screens/PromotePostScreen';

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
      <Stack.Screen name="CompleteFree" component={CompleteFreeScreen} />
      <Stack.Screen name="Menu" component={MenuScreen} />
      <Stack.Screen name="ExploreProfiles" component={ExploreProfilesScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="PublishMenu" component={PublishMenuScreen} />
      <Stack.Screen name="ProfilePro" component={ProfileProScreen} />
      <Stack.Screen name="EditProfileFree" component={EditProfileFree} /> 
      <Stack.Screen name="FilteredProfiles" component={FilteredProfilesScreen} />
      <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
      <Stack.Screen name="ViewPosts" component={ViewPostsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="ExplorePosts" component={ExplorePostsScreen} />
      <Stack.Screen name="Promote" component={PromoteScreen} />
      <Stack.Screen name="PromoteProfile" component={PromoteProfileScreen} />
      <Stack.Screen name="PromotePost" component={PromotePostScreen} />

    </Stack.Navigator>
  );
}
