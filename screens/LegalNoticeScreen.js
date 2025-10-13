// screens/LegalNoticeScreen.js
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LEGAL_URL    = 'https://www.elenlace.cl/aviso-legal';     // cambia si tu ruta difiere
const PRIVACY_URL  = 'https://www.elenlace.cl/privacidad';       // coherente con SettingsScreen
const SUPPORT_MAIL = 'contacto@elenlace.cl';

async function openLink(url) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) return Linking.openURL(url);
  } catch {}
  Alert.alert('No se pudo abrir', `Copia este enlace en tu navegador:\n${url}`);
}

export default function LegalNoticeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Volver">
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Aviso Legal</Text>

        {/* Titular e identificación */}
        <Text style={styles.sectionTitle}>1) Titular e identificación</Text>
        <Text style={styles.paragraph}>
          Esta aplicación, “El Enlace”, y el dominio <Text style={styles.bold}>elenlace.cl</Text> son propiedad de
          <Text style={styles.bold}> Jhon Alberto Santana Santiago</Text> (en adelante, “El Titular”).
          Para comunicaciones legales, escribe a{' '}
          <Text style={styles.link} onPress={() => openLink(`mailto:${SUPPORT_MAIL}`)}>{SUPPORT_MAIL}</Text>.
        </Text>

        {/* Objeto */}
        <Text style={styles.sectionTitle}>2) Objeto</Text>
        <Text style={styles.paragraph}>
          La finalidad de la app es facilitar la conexión entre talentos, prestadores de servicios audiovisuales,
          agencias y productoras. El uso de la plataforma implica aceptación de este Aviso Legal.
        </Text>

        {/* Propiedad intelectual */}
        <Text style={styles.sectionTitle}>3) Propiedad intelectual e industrial</Text>
        <Text style={styles.paragraph}>
          El diseño, código, logotipos, imágenes, textos y demás elementos de la app están protegidos por la legislación
          de propiedad intelectual e industrial aplicable. Queda prohibida su reproducción, distribución o transformación
          total o parcial sin autorización escrita del Titular.
        </Text>

        {/* Naturaleza del servicio */}
        <Text style={styles.sectionTitle}>4) Naturaleza del servicio</Text>
        <Text style={styles.paragraph}>
          “El Enlace” es una plataforma tecnológica que facilita el contacto entre usuarios. No es sindicato, colegio
          profesional ni gremio, y no representa ni negocia en nombre de usuarios. Cualquier relación surgida entre
          usuarios es de exclusiva responsabilidad de las partes.
        </Text>

        {/* Responsabilidad */}
        <Text style={styles.sectionTitle}>5) Responsabilidad y exenciones</Text>
        <Text style={styles.paragraph}>
          En la medida permitida por ley, el servicio se ofrece “tal cual”. El Titular no será responsable por daños
          indirectos, lucro cesante o pérdida de datos derivados del uso o imposibilidad de uso de la app.
        </Text>

        {/* Contenido de usuario y moderación */}
        <Text style={styles.sectionTitle}>6) Contenido de usuario y moderación</Text>
        <Text style={styles.paragraph}>
          Los usuarios son responsables del contenido que publican. Usamos herramientas de moderación (incluida IA) para
          detectar incumplimientos. El Titular puede retirar contenidos y suspender cuentas ante infracciones o riesgos.
        </Text>

        {/* Enlaces de terceros */}
        <Text style={styles.sectionTitle}>7) Enlaces y contenido de terceros</Text>
        <Text style={styles.paragraph}>
          La app puede incluir enlaces o contenidos de terceros. El Titular no controla ni responde por su disponibilidad
          o legalidad. Si detectas enlaces o contenidos ilícitos, avísanos a{' '}
          <Text style={styles.link} onPress={() => openLink(`mailto:${SUPPORT_MAIL}?subject=Reporte%20de%20contenido`)}>{SUPPORT_MAIL}</Text>.
        </Text>

        {/* Avisos de infracción */}
        <Text style={styles.sectionTitle}>8) Notificaciones de infracción</Text>
        <Text style={styles.paragraph}>
          Si crees que algún contenido vulnera derechos de autor, privacidad o marcas, envía un aviso con información de
          contacto, identificación del contenido y prueba de titularidad a{' '}
          <Text style={styles.link} onPress={() => openLink(`mailto:${SUPPORT_MAIL}?subject=Notificaci%C3%B3n%20de%20infracci%C3%B3n`)}>{SUPPORT_MAIL}</Text>.
        </Text>

        {/* Privacidad */}
        <Text style={styles.sectionTitle}>9) Protección de datos</Text>
        <Text style={styles.paragraph}>
          El tratamiento de datos personales se rige por nuestra{' '}
          <Text style={styles.link} onPress={() => openLink(PRIVACY_URL)}>Política de Privacidad</Text>.
        </Text>

        {/* Jurisdicción */}
        <Text style={styles.sectionTitle}>10) Ley aplicable y jurisdicción</Text>
        <Text style={styles.paragraph}>
          Este Aviso Legal se rige por las leyes de Chile. Cualquier disputa será sometida a los tribunales competentes
          de Santiago de Chile.
        </Text>

        {/* Actualizaciones */}
        <Text style={styles.sectionTitle}>11) Cambios y vigencia</Text>
        <Text style={styles.paragraph}>
          El Titular puede actualizar este Aviso Legal. La versión vigente será la publicada en la app y/o el sitio web.
        </Text>

        <Text style={styles.updateText}>Última actualización: 09/09/2025</Text>

        <TouchableOpacity style={styles.webButton} onPress={() => openLink(LEGAL_URL)}>
          <Text style={styles.webButtonText}>🌐 Ver este aviso legal en la web</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // base
  container: { flex: 1, backgroundColor: '#000', paddingTop: 30 },
  backButton: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },

  // textos
  title: { fontSize: 22, fontWeight: 'bold', color: '#D8A353', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#D8A353', marginTop: 16, marginBottom: 8 },
  paragraph: { fontSize: 14, color: '#ccc', marginBottom: 12, lineHeight: 22, textAlign: 'justify' },
  bold: { fontWeight: '700' },
  link: { color: '#D8A353', textDecorationLine: 'underline' },
  updateText: { marginTop: 24, fontSize: 12, color: '#888', textAlign: 'center' },

  // botón web
  webButton: { backgroundColor: '#D8A353', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  webButtonText: { color: '#000', fontWeight: 'bold' },
});
