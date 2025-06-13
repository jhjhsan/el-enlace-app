import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import {
  goToFormularioFree,
  goToCompleteProfile,
  goToCompleteElite,
} from '../utils/navigationHelpers';
import { backupAllProfiles } from '../src/firebase/helpers/backupAllProfiles'; // ⬅️ Asegúrate de tener esto arriba


export default function InitialRedirectScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (!userDataString) return;

        const userData = JSON.parse(userDataString);
        const { email, membershipType, hasPaid, trialEndsAt } = userData;

        // ⚠️ Si no hay tipo de cuenta definido
        if (!membershipType || !email) return;

        // 🚫 Verificar si expiró el período de prueba
        const now = Date.now();
        if (trialEndsAt && !hasPaid) {
          const trialEnd = new Date(trialEndsAt).getTime();
          if (now > trialEnd) {
            console.log('⏳ Prueba expirada. Ir a formulario FREE.');
            return goToFormularioFree(navigation);
          }
        }

        // 📦 Verificar si el perfil está guardado según el tipo
        let profile = null;

        if (membershipType === 'pro') {
          profile = await AsyncStorage.getItem('userProfilePro');
          if (profile) {
            console.log('✅ Perfil Pro detectado. Ir a MainTabs.');
            await backupAllProfiles(); // 🧠
            return navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              })
            );
          } else {
            return goToCompleteProfile(navigation);
          }
        }

        if (membershipType === 'elite') {
          profile = await AsyncStorage.getItem('userProfileElite');
          const parsed = profile ? JSON.parse(profile) : null;

          if (
            parsed?.profilePhoto &&
            parsed?.profileVideo &&
            parsed?.logos?.length > 0
          ) {
            console.log('✅ Perfil Elite completo. Ir a MainTabs.');
            await backupAllProfiles(); // 🧠
            return navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              })
            );
          } else {
            return goToCompleteElite(navigation);
          }
        }

        if (membershipType === 'free') {
  profile = await AsyncStorage.getItem('userProfileFree');
  if (profile) {
    console.log('✅ Perfil Free detectado. Ir a MainTabs.');
    await backupAllProfiles(); // 🧠
    return navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      })
    );
  } else {
    return goToFormularioFree(navigation);
  }
}
      } catch (error) {
        console.error('Error en InitialRedirectScreen:', error);
      }
    };

    checkUser();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#D8A353" />
    </View>
  );
}
