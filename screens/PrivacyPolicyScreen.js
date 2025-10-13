// screens/PrivacyPolicyScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRIVACY_URL = 'https://www.elenlace.cl/privacidad'; // documento canónico en la web
const SUPPORT_EMAIL = 'contacto@elenlace.cl';

async function openLink(url) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) return Linking.openURL(url);
  } catch {}
  Alert.alert('No se pudo abrir', `Copia este enlace en tu navegador:\n${url}`);
}

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon} accessibilityLabel="Volver">
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Política de Privacidad (resumen)</Text>
        <Text style={styles.updated}>Última actualización: 09 de septiembre de 2025 • El texto completo y vigente está en nuestra web.</Text>

        <Text style={styles.text}>
          Esta Política explica cómo tratamos tus datos al usar “El Enlace”. Este es un <Text style={styles.bold}>resumen</Text> para uso dentro de la app. La versión canónica y siempre vigente es la publicada en nuestro sitio.
        </Text>

        <Text style={styles.sectionTitle}>1. Datos que tratamos</Text>
        <Text style={styles.text}>• Identificación y contacto (p. ej., nombre, correo).</Text>
        <Text style={styles.text}>• Contenido de perfil (p. ej., fotos, videos, skills).</Text>
        <Text style={styles.text}>• Datos técnicos (p. ej., notificaciones push, uso básico de la app).</Text>

        <Text style={styles.sectionTitle}>2. Finalidades</Text>
        <Text style={styles.text}>• Crear y mostrar tu perfil para conectar talentos con agencias/productoras.</Text>
        <Text style={styles.text}>• Operar funciones de mensajería y notificaciones.</Text>
        <Text style={styles.text}>• Mejorar seguridad, prevenir abuso y mantener la calidad del servicio.</Text>

        <Text style={styles.sectionTitle}>3. Base de legitimación</Text>
        <Text style={styles.text}>• Ejecución del contrato (proveer la app y sus funciones).</Text>
        <Text style={styles.text}>• Interés legítimo (seguridad, prevención de fraude, calidad).</Text>
        <Text style={styles.text}>• Consentimiento cuando aplique (p. ej., notificaciones promocionales).</Text>

        <Text style={styles.sectionTitle}>4. Terceros y encargados</Text>
        <Text style={styles.text}>
          No vendemos tus datos. Podemos apoyarnos en proveedores que prestan servicios de hosting, almacenamiento, envío de notificaciones o moderación automática, sujetos a obligaciones de confidencialidad y seguridad.
        </Text>

        <Text style={styles.sectionTitle}>5. Retención</Text>
        <Text style={styles.text}>
          Conservamos tus datos mientras tu cuenta esté activa y por el tiempo necesario para cumplir obligaciones legales, resolver disputas y mantener la seguridad. Cuando eliminas tu cuenta desde la app, borramos tu perfil y contenidos asociados, salvo lo que la ley exija conservar.
        </Text>

        <Text style={styles.sectionTitle}>6. Tus derechos</Text>
        <Text style={styles.text}>• Acceso, rectificación, eliminación y portabilidad de datos.</Text>
        <Text style={styles.text}>• Oposición o limitación del tratamiento, según corresponda.</Text>
        <Text style={styles.text}>
          Puedes ejercerlos desde la app (p. ej., <Text style={styles.bold}>Configuración {'>'} Eliminar cuenta</Text>) o escribiendo a <Text style={styles.link} onPress={() => openLink(`mailto:${SUPPORT_EMAIL}?subject=Solicitud%20de%20derechos`)}>{SUPPORT_EMAIL}</Text>.
        </Text>

        <Text style={styles.sectionTitle}>7. Menores de edad</Text>
        <Text style={styles.text}>
          La app no está dirigida a menores de 13 años. Si crees que un menor creó una cuenta, contáctanos para eliminarla.
        </Text>

        <Text style={styles.sectionTitle}>8. Cambios</Text>
        <Text style={styles.text}>
          Podemos actualizar esta Política. La versión vigente estará siempre disponible en nuestro sitio web.
        </Text>

        <Text style={styles.sectionTitle}>9. Contacto</Text>
        <Text style={styles.text}>
          Dudas o solicitudes: <Text style={styles.link} onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)}>{SUPPORT_EMAIL}</Text>
        </Text>

        <TouchableOpacity onPress={() => openLink(PRIVACY_URL)} style={styles.webBtn}>
          <Ionicons name="open-outline" size={18} color="#000" />
          <Text style={styles.webBtnText}>Ver política completa en la web</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 30 },
  backIcon: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  title: { color: '#D8A353', fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  updated: { color: '#9aa', fontSize: 12, marginBottom: 12, textAlign: 'center' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 16 },
  text: { color: '#ccc', fontSize: 14, lineHeight: 22, marginTop: 8, textAlign: 'justify' },
  bold: { fontWeight: '700' },
  link: { color: '#4DA6FF', textDecorationLine: 'underline' },
  webBtn: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  webBtnText: { color: '#000', fontWeight: '700' },
});
