// screens/DeleteAccountInfoScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const DELETE_URL = 'https://www.elenlace.cl/eliminar-cuenta';
const SUPPORT_EMAIL = 'contacto@elenlace.cl';

async function openLink(url) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) return Linking.openURL(url);
  } catch {}
  Alert.alert('No se pudo abrir', `Copia este enlace en tu navegador:\n${url}`);
}

export default function DeleteAccountInfoScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.screen}>
      {/* Back */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
        accessibilityLabel="Volver"
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🗑️ Eliminar cuenta y datos</Text>

        <Text style={styles.sectionTitle}>¿Cómo eliminar tu cuenta desde la app?</Text>
        <Text style={styles.text}>
          1) Abre <Text style={styles.bold}>Configuración</Text> {'>'} <Text style={styles.bold}>Eliminar cuenta</Text>.
        </Text>
        <Text style={styles.text}>
          2) Por seguridad te pediremos <Text style={styles.bold}>reautenticación</Text> con tu contraseña.
        </Text>
        <Text style={styles.text}>
          3) Al confirmar, eliminaremos tu cuenta y datos asociados de forma permanente.
        </Text>

        <Text style={styles.sectionTitle}>Si no tienes acceso a la app</Text>
        <Text style={styles.text}>
          Escríbenos desde el correo asociado a tu cuenta a{' '}
          <Text
            style={styles.link}
            onPress={() => openLink(`mailto:${SUPPORT_EMAIL}?subject=Eliminar%20cuenta`)}
          >
            {SUPPORT_EMAIL}
          </Text>{' '}
          con el asunto <Text style={styles.bold}>"Eliminar cuenta"</Text>. Procesaremos la solicitud tras verificar tu identidad.
        </Text>

        <Text style={styles.sectionTitle}>¿Qué datos se eliminan?</Text>
        <Text style={styles.text}>• Perfil (Free/Pro/Elite), fotos y videos.</Text>
        <Text style={styles.text}>• Mensajes y notificaciones.</Text>
        <Text style={styles.text}>• Tokens de notificación y metadatos de perfil.</Text>
        <Text style={styles.text}>
          • Copias en caché locales.{' '}
          <Text style={styles.dim}>
            (Podrían permanecer copias de seguridad por requisitos legales o para resolución de fraudes y cargos, solo por el tiempo permitido por ley).
          </Text>
        </Text>

        <Text style={styles.sectionTitle}>Plazos</Text>
        <Text style={styles.text}>
          La eliminación es inmediata a nivel de aplicación. Eliminaciones complementarias (p. ej., backups) pueden demorar según políticas de retención del proveedor.
        </Text>

        <Text style={styles.sectionTitle}>Soporte</Text>
        <Text style={styles.text}>
          ¿Dudas o problemas? Escríbenos a{' '}
          <Text
            style={styles.link}
            onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)}
          >
            {SUPPORT_EMAIL}
          </Text>.
        </Text>

        <Text style={styles.updatedAt}>Última actualización: 09/09/2025</Text>

        <TouchableOpacity style={styles.button} onPress={() => openLink(DELETE_URL)}>
          <Text style={styles.buttonText}>🌐 Ver esta guía en la web</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  backBtn: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
  container: { padding: 20, paddingBottom: 60, marginTop: 50 },
  title: { fontSize: 22, color: '#D8A353', fontWeight: 'bold', marginBottom: 18, textAlign: 'center' },
  sectionTitle: { color: '#D8A353', fontSize: 16, fontWeight: '600', marginTop: 18, marginBottom: 8 },
  text: { color: '#ddd', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  dim: { color: '#aaa' },
  bold: { fontWeight: '700' },
  updatedAt: { color: '#888', fontSize: 12, marginTop: 14 },
  button: {
    backgroundColor: '#D8A353',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#000', fontWeight: 'bold' },
});
