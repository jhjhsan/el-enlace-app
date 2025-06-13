import { CommonActions } from '@react-navigation/native';

/**
 * 🔁 Navegar al formulario Free
 */
export const goToFormularioFree = (navigation) => {
  navigation.navigate('FormularioFree');
};

/**
 * 📝 Navegar al formulario Pro
 */
export const goToCompleteProfile = (navigation) => {
  navigation.navigate('CompleteProfile');
};

/**
 * 🏢 Navegar al formulario Elite
 */
export const goToCompleteElite = (navigation) => {
  navigation.navigate('CompleteElite');
};

/**
 * 👤 Ir a MainTabs (abre Perfil por defecto)
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
 * 📊 Ir a MainTabs (abre Dashboard por defecto)
 */
export const goToDashboardTab = (navigation) => {
  navigation.dispatch(
    CommonActions.navigate('MainAppContainer', {
      screen: 'MainTabs',
      params: { screen: 'DashboardTab' },
    })
  );
};
