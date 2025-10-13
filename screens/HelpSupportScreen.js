// screens/HelpSupportScreen.js
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

const ACCENT = '#D8A353';
const BG = '#000';
const LINK = '#4DA6FF';

// 🔧 AJUSTA ESTOS VALORES A TU DATO REAL
const SUPPORT_EMAIL = 'contacto@elenlace.cl';      // si prefieres contacto@, cámbialo aquí
const WHATSAPP_E164 = '56998765760';              // E.164 sin + ni espacios => 56 (país) + 9 (móvil) + número
const HELP_URL   = 'https://www.elenlace.cl/ayuda';
const PRIV_URL   = 'https://www.elenlace.cl/privacidad';
const TERMS_URL  = 'https://www.elenlace.cl/terminos';
const DELETE_URL = 'https://www.elenlace.cl/eliminar-cuenta';

async function openLink(url) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) return Linking.openURL(url);
  } catch {}
  Alert.alert('No se pudo abrir', `Copia este enlace en tu navegador:\n${url}`);
}

export default function HelpSupportScreen() {
  const navigation = useNavigation();

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=Soporte%20Enlace%20App&body=Describe%20tu%20consulta%20o%20problema%20aquí...`;
  const wa = `https://wa.me/${WHATSAPP_E164}`;

  return (
    <View style={styles.screen}>
      {/* Back */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.back}
        accessibilityLabel="Volver"
        accessibilityRole="button"
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🆘 Centro de Ayuda</Text>

        <Text style={styles.info}>
          ¿Tienes preguntas, sugerencias o problemas con la app? Estamos aquí para ayudarte. Prioriza el correo para recibir seguimiento de tu caso.
        </Text>

        {/* Canales */}
        <Text style={styles.sectionTitle}>Canales de contacto</Text>

        <TouchableOpacity style={styles.actionBtn} onPress={() => openLink(mailto)}>
          <Ionicons name="mail-outline" size={18} color="#000" />
          <Text style={styles.actionTxt}>Escribir a {SUPPORT_EMAIL}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => openLink(wa)}>
          <Ionicons name="logo-whatsapp" size={18} color="#000" />
          <Text style={styles.actionTxt}>WhatsApp (soporte)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => openLink(HELP_URL)}>
          <Ionicons name="globe-outline" size={18} color="#000" />
          <Text style={styles.actionTxt}>Centro de ayuda en la web</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          * WhatsApp es un canal alternativo. Para temas sensibles de privacidad, usa siempre el correo.
        </Text>

        {/* FAQ breve dentro de la app */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Preguntas frecuentes</Text>

        <View style={styles.card}>
          <Text style={styles.q}>¿Cómo restablezco mi contraseña?</Text>
          <Text style={styles.a}>
            Ve a <Text style={styles.bold}>Ajustes {'>'} Cambiar contraseña</Text>. Recibirás un correo con instrucciones.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.q}>¿Cómo elimino mi cuenta y datos?</Text>
          <Text style={styles.a}>
            En <Text style={styles.bold}>Ajustes {'>'} Eliminar cuenta</Text>. Si no tienes acceso a la app, escribe a {SUPPORT_EMAIL}. Más info en{' '}
            <Text style={styles.link} onPress={() => openLink(DELETE_URL)}>esta guía</Text>.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.q}>No recibo notificaciones</Text>
          <Text style={styles.a}>
            Revisa permisos del sistema (notificaciones activadas), conexión a internet y que la app esté actualizada. Si persiste, contáctanos por correo con capturas.
          </Text>
        </View>

        {/* Políticas relevantes */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Políticas y legales</Text>

        <View style={styles.inlineLinks}>
          <Text style={styles.inlineText}>Privacidad: </Text>
          <Text style={styles.link} onPress={() => openLink(PRIV_URL)}>{PRIV_URL}</Text>
        </View>
        <View style={styles.inlineLinks}>
          <Text style={styles.inlineText}>Términos: </Text>
          <Text style={styles.link} onPress={() => openLink(TERMS_URL)}>{TERMS_URL}</Text>
        </View>

        {/* SLA y horario */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Horarios y tiempos de respuesta</Text>
        <Text style={styles.info}>
          Lunes a Viernes, 09:00–18:00 (GMT-3). Tiempo de respuesta habitual: 24–48 h hábiles.
        </Text>

        {/* Ver en la web */}
        <TouchableOpacity style={[styles.actionBtn, { marginTop: 8 }]} onPress={() => openLink(HELP_URL)}>
          <Ionicons name="open-outline" size={18} color="#000" />
          <Text style={styles.actionTxt}>Ver esta sección en la web</Text>
        </TouchableOpacity>

        <Text style={styles.updated}>Última actualización: 09/09/2025</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  back: { position: 'absolute', top: 40, left: 20, zIndex: 10 },

  container: { padding: 20, paddingBottom: 120, marginTop: 30 },

  title: { fontSize: 22, color: ACCENT, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  info: { color: '#ccc', fontSize: 14, lineHeight: 22, marginBottom: 14 },

  sectionTitle: { color: ACCENT, fontSize: 15, fontWeight: '700', marginBottom: 10 },

  actionBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  actionTxt: { color: '#000', fontWeight: '700', fontSize: 14 },

  note: { color: '#9AA0A6', fontSize: 12, marginTop: -4, marginBottom: 10 },

  card: {
    backgroundColor: '#1A1A1A',
    borderColor: '#2A2A2A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  q: { color: '#eee', fontWeight: '700', marginBottom: 6 },
  a: { color: '#ddd', fontSize: 13, lineHeight: 20 },

  inlineLinks: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' },
  inlineText: { color: '#ccc', fontSize: 13 },
  link: { color: LINK, textDecorationLine: 'underline' },

  updated: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
