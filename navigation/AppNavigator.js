import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import { useUser } from '../contexts/UserContext';

// Importa la nueva navegación principal
import MainTabs from './MainTabs';

// Importa todas las demás pantallas necesarias
import InitialRedirectScreen from '../screens/InitialRedirectScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DashboardEliteScreen from '../screens/DashboardEliteScreen';
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
import CompleteEliteScreen from '../screens/CompleteEliteScreen';
import EditProfileEliteScreen from '../screens/EditProfileEliteScreen';
import MessagesScreen from '../screens/MessagesScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import MessageDetailScreen from '../screens/MessageDetailScreen';
import InboxScreen from '../screens/InboxScreen';
import UpgradeToProScreen from '../screens/UpgradeToProScreen';
import PaymentProScreen from '../screens/PaymentProScreen';
import PaymentEliteScreen from '../screens/PaymentEliteScreen';
import CreateAdScreen from '../screens/CreateAdScreen';
import MyAdsScreen from '../screens/MyAdsScreen';
import AllAdsScreen from '../screens/AllAdsScreen';
import DebugUserDataScreen from '../screens/DebugUserDataScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsAndConditionsScreen from '../screens/TermsAndConditionsScreen';
import LegalNoticeScreen from '../screens/LegalNoticeScreen';
import CastingFilterBuilder from '../screens/CastingFilterBuilder';
import StatsEliteScreen from '../screens/StatsEliteScreen';
import PostulationHistoryEliteScreen from '../screens/PostulationHistoryEliteScreen';
import EmailNotVerifiedScreen from '../screens/EmailNotVerifiedScreen';
import ChatWithIA from '../screens/ChatWithIA';
import IASuggestionsHistoryScreen from '../screens/IASuggestionsHistoryScreen';
import AssistantIAProfileScreen from '../screens/AssistantIAProfileScreen';
import FocusDetailScreen from '../screens/FocusDetailScreen';
import MyFocusScreen from '../screens/MyFocusScreen';
import PromoteServiceScreen from '../screens/PromoteServiceScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isLoggedIn, isLoading } = useUser();

  if (isLoading) {
    console.log('⏳ AppNavigator esperando datos de sesión...');
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      initialRouteName="InitialRedirect"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="InitialRedirect" component={InitialRedirectScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />

      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="DashboardElite" component={DashboardEliteScreen} />
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
      <Stack.Screen name="CompleteElite" component={CompleteEliteScreen} />
      <Stack.Screen name="EditProfileElite" component={EditProfileEliteScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MessageDetail" component={MessageDetailScreen} />
      <Stack.Screen name="Inbox" component={InboxScreen} />
      <Stack.Screen name="UpgradeToPro" component={UpgradeToProScreen} />
      <Stack.Screen name="PaymentPro" component={PaymentProScreen} />
      <Stack.Screen name="PaymentElite" component={PaymentEliteScreen} />
      <Stack.Screen name="CreateAdScreen" component={CreateAdScreen} />
      <Stack.Screen name="MyAds" component={MyAdsScreen} />
      <Stack.Screen name="AllAdsScreen" component={AllAdsScreen} />
      <Stack.Screen
        name="DebugUserData"
        component={DebugUserDataScreen}
        options={{ headerShown: true, title: 'Datos de usuario' }}
      />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
      <Stack.Screen name="LegalNotice" component={LegalNoticeScreen} />
      <Stack.Screen name="StatsElite" component={StatsEliteScreen} options={{ title: 'Estadísticas' }} />
      <Stack.Screen name="PostulationHistoryElite" component={PostulationHistoryEliteScreen} />
      <Stack.Screen name="EmailNotVerified" component={EmailNotVerifiedScreen} />
      <Stack.Screen name="ChatWithIA" component={ChatWithIA} />
      <Stack.Screen name="IASuggestionsHistory" component={IASuggestionsHistoryScreen} />
      <Stack.Screen name="AssistantIAProfile" component={AssistantIAProfileScreen} />
      <Stack.Screen name="FocusDetailScreen" component={FocusDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MyFocusScreen" component={MyFocusScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PromoteServiceScreen" component={PromoteServiceScreen} options={{ headerShown: false }} />
      
    </Stack.Navigator>
  );
}
