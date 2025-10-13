// screens/TermsAndConditionsScreen.js
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TERMS_URL = 'https://www.elenlace.cl/terminos';
const PRIVACY_URL = 'https://www.elenlace.cl/privacidad';
const DELETE_URL = 'https://www.elenlace.cl/eliminar-cuenta';
const SUPPORT_EMAIL = 'soporte@elenlace.cl';

async function openLink(url) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) return Linking.openURL(url);
  } catch {}
  Alert.alert('No se pudo abrir', `Copia este enlace en tu navegador:\n${url}`);
}

export default function TermsAndConditionsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Volver">
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Términos y Condiciones de Uso</Text>

        <Text style={styles.sectionTitle}>1) Aceptación y alcance</Text>
        <Text style={styles.paragraph}>
          Al usar “El Enlace”, aceptas estos Términos. Si no estás de acuerdo, no uses la aplicación.
        </Text>

        <Text style={styles.sectionTitle}>2) Edad y elegibilidad</Text>
        <Text style={styles.paragraph}>
          Debes tener al menos 18 años (o mayoría de edad vigente en tu país). Usuarios de 13–17 años solo con consentimiento de su madre/padre o tutor legal. La app no está dirigida a menores de 13.
        </Text>

        <Text style={styles.sectionTitle}>3) Cuenta, veracidad y seguridad</Text>
        <Text style={styles.paragraph}>
          Eres responsable de la veracidad de tus datos y de mantener la confidencialidad de tus credenciales. Eres responsable de la actividad realizada con tu cuenta.
        </Text>

        <Text style={styles.sectionTitle}>4) Conducta prohibida</Text>
        <Text style={styles.paragraph}>• Suplantar identidades o publicar contenido engañoso.</Text>
        <Text style={styles.paragraph}>• Contenido ilegal, violento, sexualmente explícito, discriminatorio, o que infrinja derechos de autor/privacidad.</Text>
        <Text style={styles.paragraph}>• Scraping, minería o extracción masiva de datos sin permiso.</Text>
        <Text style={styles.paragraph}>• Interferir con la seguridad/funcionamiento del servicio.</Text>

        <Text style={styles.sectionTitle}>5) Contenido del usuario y licencia limitada</Text>
        <Text style={styles.paragraph}>
          Conservas los derechos de tu contenido. Nos otorgas una licencia no exclusiva, mundial y limitada para alojarlo, mostrarlo y distribuirlo dentro del servicio con fines de operación y mejora.
        </Text>

        <Text style={styles.sectionTitle}>6) Moderación y medidas</Text>
        <Text style={styles.paragraph}>
          Usamos moderación (incluida IA) para detectar contenido que infrinja normas. Podemos retirar contenido, suspender o cerrar cuentas en caso de incumplimiento o riesgo de seguridad.
        </Text>

        <Text style={styles.sectionTitle}>7) Planes, suscripciones y pagos</Text>
        <Text style={styles.paragraph}>
          Algunas funciones requieren suscripción (p. ej., Pro/Elite). Los precios, periodos y renovaciones se informan antes del pago. Las compras se gestionan por las tiendas (App Store/Google Play) y se aplican sus políticas de cobro y reembolso.
        </Text>

        <Text style={styles.sectionTitle}>8) Notificaciones</Text>
        <Text style={styles.paragraph}>
          Podemos enviarte notificaciones técnicas, de seguridad y novedades. Puedes gestionarlas en los ajustes del dispositivo o dentro de la app.
        </Text>

        <Text style={styles.sectionTitle}>9) Privacidad</Text>
        <Text style={styles.paragraph}>
          El tratamiento de datos se rige por nuestra{' '}
          <Text style={styles.link} onPress={() => openLink(PRIVACY_URL)}>Política de Privacidad</Text>.
        </Text>

        <Text style={styles.sectionTitle}>10) Eliminación de cuenta y datos</Text>
        <Text style={styles.paragraph}>
          Puedes eliminar tu cuenta en <Text style={styles.bold}>Configuración &gt; Eliminar cuenta</Text>. 
          Si no tienes acceso a la app, solicita la eliminación vía email a{' '}
          <Text style={styles.link} onPress={() => openLink(`mailto:${SUPPORT_EMAIL}?subject=Eliminar%20cuenta`)}>{SUPPORT_EMAIL}</Text>. 
          Más info en <Text style={styles.link} onPress={() => openLink(DELETE_URL)}>{DELETE_URL}</Text>.
        </Text>

        <Text style={styles.sectionTitle}>11) Limitación de responsabilidad</Text>
        <Text style={styles.paragraph}>
          En la medida permitida por ley, el servicio se ofrece “tal cual”. No seremos responsables por daños indirectos, incidentales o pérdida de datos derivados del uso o imposibilidad de uso de la app.
        </Text>

        <Text style={styles.sectionTitle}>12) Disponibilidad y cambios del servicio</Text>
        <Text style={styles.paragraph}>
          Podemos modificar, suspender o descontinuar funciones por motivos técnicos, legales o de seguridad.
        </Text>

        <Text style={styles.sectionTitle}>13) Cambios de estos Términos</Text>
        <Text style={styles.paragraph}>
          Podemos actualizar estos Términos. El uso continuado tras la actualización implica aceptación.
        </Text>

        <Text style={styles.sectionTitle}>14) Ley aplicable y jurisdicción</Text>
        <Text style={styles.paragraph}>
          Estos Términos se rigen por las leyes de Chile. Cualquier controversia será conocida por los tribunales competentes de Santiago de Chile.
        </Text>

        <Text style={styles.sectionTitle}>15) Contacto</Text>
        <Text style={styles.paragraph}>
          Escríbenos a <Text style={styles.link} onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)}>{SUPPORT_EMAIL}</Text>.
        </Text>

        <Text style={styles.updateText}>Última actualización: 09/09/2025</Text>

        <TouchableOpacity style={styles.webButton} onPress={() => openLink(TERMS_URL)}>
          <Text style={styles.webButtonText}>🌐 Ver estos términos en la web</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // base
  container: { flex: 1, backgroundColor: '#000', paddingTop: 40 },
  backButton: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },

  // textos
  title: { fontSize: 22, fontWeight: 'bold', color: '#D8A353', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#D8A353', marginTop: 16, marginBottom: 8 },
  paragraph: { fontSize: 14, color: '#ccc', marginBottom: 10, lineHeight: 22, textAlign: 'justify' },
  bold: { fontWeight: '700' },
  link: { color: '#D8A353', textDecorationLine: 'underline' },
  updateText: { marginTop: 20, fontSize: 12, color: '#888', textAlign: 'center' },

  // botón web
  webButton: { backgroundColor: '#D8A353', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  webButtonText: { color: '#000', fontWeight: 'bold' },
});
