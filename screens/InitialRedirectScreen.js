import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  goToProfileTab,
  goToFormularioFree,
  goToCompleteProfile,
  goToCompleteElite,
} from '../utils/navigationHelpers';

const restoreProfileIfMissing = async (key, data) => {
  const existing = await AsyncStorage.getItem(key);
  if (!existing) {
    await AsyncStorage.setItem(key, JSON.stringify(data));
    console.log(`🧩 Perfil restaurado en ${key}`);
  }
};

export default function InitialRedirectScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    const redirectUser = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (!userDataString) return;

        let userData = JSON.parse(userDataString);
        const { email } = userData;

        // 🔄 Restaurar perfil correcto desde su almacenamiento
        let profileString = null;
        const profilePro = await AsyncStorage.getItem('userProfilePro');
        const parsedPro = profilePro ? JSON.parse(profilePro) : null;

if (parsedPro?.email?.toLowerCase() === email.toLowerCase()) {
 userData = { ...userData, ...parsedPro };
await AsyncStorage.setItem('userData', JSON.stringify(userData));
await restoreProfileIfMissing('userProfilePro', userData);
console.log('✅ Perfil restaurado correctamente:', userData.membershipType);

}
else {
          const profileElite = await AsyncStorage.getItem('userProfileElite');
          const parsedElite = profileElite ? JSON.parse(profileElite) : null;

          if (parsedElite?.email?.toLowerCase() === email.toLowerCase()) {
            userData = { ...userData, ...parsedElite };
await AsyncStorage.setItem('userData', JSON.stringify(userData));
await restoreProfileIfMissing('userProfileElite', userData);
console.log('🔁 Restaurado perfil ELITE correctamente');

          } else {
            const fallback = await AsyncStorage.getItem(`userProfile_${email}`);
            if (fallback) {
              userData = JSON.parse(fallback);
              await AsyncStorage.setItem('userData', JSON.stringify(userData));
              if (!userData || !userData.email || userData.membershipType !== 'free') {
  console.warn('❌ Fallback evitado: perfil no es FREE o ya está definido');
  return;
}
              console.log('🔁 Restaurado perfil FREE desde fallback');
            }
          }
        }

        // ✅ Aquí validamos membershipType
        const { membershipType } = userData;
        if (!membershipType) {
          console.log('❌ No se detectó membershipType. Esperando...');
          return;
        }

        setTimeout(async () => {
          const now = Date.now();

          if (userData.trialEndsAt && !userData.hasPaid) {
            const trialEnd = new Date(userData.trialEndsAt).getTime();
            if (now > trialEnd) {
              console.log('⏳ Período de prueba expirado. Degradando a Free.');

              const downgradedUser = {
                ...userData,
                membershipType: 'free',
                hasPaid: false,
                subscriptionType: null,
              };
              await AsyncStorage.setItem('userData', JSON.stringify(downgradedUser));
              return goToFormularioFree(navigation);
            }
          }

          let profileString = null;

          if (membershipType === 'pro') {
            profileString = await AsyncStorage.getItem('userProfilePro');
          } else if (membershipType === 'elite') {
            profileString = await AsyncStorage.getItem('userProfileElite');
          } else {
            profileString = await AsyncStorage.getItem(`userProfile_${email}`);
          }

          const profile = profileString ? JSON.parse(profileString) : null;

          if (membershipType === 'free') {
            if (profile) {
              goToProfileTab(navigation);
            } else {
              goToFormularioFree(navigation);
            }
            return;
          }

       if (membershipType === 'pro') {
  // Siempre ir al perfil aunque falte info (ya no usamos CompleteProfile desde login)
  goToProfileTab(navigation);
  return;
}


          if (membershipType === 'elite') {
            const eliteProfileRaw = await AsyncStorage.getItem('userProfileElite');
            const eliteProfile = eliteProfileRaw ? JSON.parse(eliteProfileRaw) : null;

            if (
              eliteProfile?.profilePhoto &&
              eliteProfile?.profileVideo &&
              eliteProfile?.logos?.length > 0
            ) {
              goToProfileTab(navigation);
            } else {
              goToCompleteElite(navigation);
            }
          }
        }, 100);
      } catch (error) {
        console.error('Error en InitialRedirectScreen:', error);
      }
    };

    redirectUser();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#D8A353" />
    </View>
  );
}
