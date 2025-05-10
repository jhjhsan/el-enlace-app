import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useUser } from '../contexts/UserContext'; // ✅ Importado para controlar acceso

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
import CastingFilterBuilder from '../screens/CastingFilterBuilder';
import ProfileEliteScreen from '../screens/ProfileEliteScreen';
import CastingDetailScreen from '../screens/CastingDetailScreen';
import PublishCastingScreen from '../screens/PublishCastingScreen';
import PublishProfileScreen from '../screens/PublishProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import PublishFocusScreen from '../screens/PublishFocusScreen';
import FocusListScreen from '../screens/FocusListScreen';
import MyCastingsScreen from '../screens/MyCastingsScreen';
import MyServicesScreen from '../screens/MyServicesScreen';
import PostulationHistoryScreen from '../screens/PostulationHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import ViewApplicationsScreen from '../screens/ViewApplicationsScreen';
import SubmitApplicationScreen from '../screens/SubmitApplicationScreen';
import EditPostScreen from '../screens/EditPostScreen';
import FormularioFree from '../screens/FormularioFree';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isLoggedIn } = useUser(); // ✅ control de sesión

  if (!isLoggedIn) return null; // ⛔️ evita el destello del Dashboard si no hay sesión activa

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
      <Stack.Screen name="CastingFilterBuilder" component={CastingFilterBuilder} />
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
      <Stack.Screen name="ProfileElite" component={ProfileEliteScreen} />
      <Stack.Screen name="CastingDetail" component={CastingDetailScreen} />
      <Stack.Screen name="PublishCastingScreen" component={PublishCastingScreen} />
      <Stack.Screen name="PublishProfile" component={PublishProfileScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="PublishFocusScreen" component={PublishFocusScreen} />
      <Stack.Screen name="FocusListScreen" component={FocusListScreen} />
      <Stack.Screen name="MyCastings" component={MyCastingsScreen} />
      <Stack.Screen name="MyServices" component={MyServicesScreen} />
      <Stack.Screen name="PostulationHistory" component={PostulationHistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="ViewApplications" component={ViewApplicationsScreen} />
      <Stack.Screen name="SubmitApplication" component={SubmitApplicationScreen} />
      <Stack.Screen name="EditPost" component={EditPostScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FormularioFree" component={FormularioFree} />
    </Stack.Navigator>
  );
}
