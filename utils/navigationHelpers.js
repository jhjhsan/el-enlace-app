// navigationHelpers.js
import { CommonActions } from '@react-navigation/native';

/**
 * 🔁 Navegar al formulario Free (registro inicial o después de bajar de plan)
 * Ruta directa porque está registrada en AppNavigator
 */
export const goToFormularioFree = (navigation) => {
  navigation.navigate('FormularioFree');
};

/**
 * 📝 Navegar al formulario de perfil Pro (solo si no tiene video o foto)
 * Asegúrate de que 'CompleteProfile' esté registrada directamente en AppNavigator
 */
export const goToCompleteProfile = (navigation) => {
  navigation.navigate('CompleteProfile');
};

/**
 * 🏢 Navegar al formulario de perfil Elite (registro inicial o edición)
 * Asegúrate de que 'CompleteElite' esté registrada directamente en AppNavigator
 */
export const goToCompleteElite = (navigation) => {
  navigation.navigate('CompleteElite');
};

/**
 * 👤 Ir a la pestaña principal de perfil dentro de MainTabs
 * Usa dispatch con CommonActions.navigate para evitar errores de ruta no manejada
 */
export const goToProfileTab = (navigation) => {
  navigation.dispatch(
    CommonActions.navigate('MainAppContainer', {
      screen: 'MainTabs',
      params: { screen: 'ProfileTab' },
    })
  );
};

/**
 * 📊 Ir directamente al Dashboard (por ejemplo, después de completar perfil Free)
 */
export const goToDashboardTab = (navigation) => {
  navigation.dispatch(
    CommonActions.navigate('MainAppContainer', {
      screen: 'MainTabs',
      params: { screen: 'DashboardTab' },
    })
  );
};

