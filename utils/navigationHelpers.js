// utils/navigationHelpers.js
import { navigationRef } from '../navigation/NavigationService';

/**
 * Navega siempre desde el contenedor raíz.
 * Evita el error "The action 'NAVIGATE' was not handled..." cuando llamas desde navegadores anidados.
 */
const navigateFromRoot = (navigation, routeName, params) => {
  // 1) Si el root NavigationContainer está listo, usa el ref global
  if (navigationRef?.isReady?.()) {
    navigationRef.navigate(routeName, params);
    return;
  }
  // 2) Si todavía no está listo, sube al padre hasta el root y navega
  let nav = navigation;
  while (nav?.getParent && nav.getParent()) nav = nav.getParent();
  (nav || navigation).navigate(routeName, params);
};

// ✅ Chequeo de campos mínimos según tipo de perfil (Free)
export const isFreeProfileComplete = (p = {}) => {
  if (!p || !p.email || p.membershipType !== 'free') return false;

  // RECURSO (autos, drones, etc.)
  if (p.profileKind === 'resource' || p.profileLock === 'resource') {
    const hasTitle = !!p.resourceTitle?.trim();
    const hasType = !!p.resourceType?.trim();
    const hasLocation = !!p.resourceLocation?.trim();
    const hasPhoto = !!p.profilePhoto || (Array.isArray(p.bookPhotos) && p.bookPhotos.length > 0);
    return hasTitle && hasType && hasLocation && hasPhoto;
  }

  // TALENTO
  const hasName = !!p.name?.trim();
  const hasCategory = Array.isArray(p.category) && p.category.length > 0;
  const hasPhoto = !!p.profilePhoto || (Array.isArray(p.bookPhotos) && p.bookPhotos.length > 0);
  return hasName && hasCategory && hasPhoto;
};

// 🔀 Router post-auth/post-guard (usa navigateFromRoot directamente)
export const goToHomeAfterAuth = (navigation, profile) => {
  if (isFreeProfileComplete(profile)) {
    navigateFromRoot(navigation, 'MainTabs', { screen: 'DashboardTab' });
  } else {
    navigateFromRoot(navigation, 'FormularioFree');
  }
};

/** 🔁 Free */
export const goToFormularioFree = (navigation) => {
  navigateFromRoot(navigation, 'FormularioFree');
};

/** 📝 Pro */
export const goToCompleteProfile = (navigation) => {
  navigateFromRoot(navigation, 'CompleteProfile');
};

/** 🏢 Elite */
export const goToCompleteElite = (navigation) => {
  navigateFromRoot(navigation, 'CompleteElite');
};

/** 👤 Abrir MainTabs en ProfileTab (ajusta el nombre del tab si difiere) */
export const goToProfileTab = (navigation) => {
  navigateFromRoot(navigation, 'MainTabs', { screen: 'ProfileTab' });
};

/** 📊 Abrir MainTabs en DashboardTab (ajusta si difiere) */
export const goToDashboardTab = (navigation) => {
  navigateFromRoot(navigation, 'MainTabs', { screen: 'DashboardTab' });
};
