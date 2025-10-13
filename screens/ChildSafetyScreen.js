// screens/ChildSafetyScreen.js
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
import { Ionicons } from '@expo/vector-icons';

const ACCENT = '#D8A353';
const CSAE_URL = 'https://www.elenlace.cl/seguridad-ninos';
const CONTACT_EMAIL = 'contacto@elenlace.cl';

async function openLink(url) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) return Linking.openURL(url);
  } catch {}
  Alert.alert('No se pudo abrir', `Copia este enlace en tu navegador:\n${url}`);
}

export default function ChildSafetyScreen({ navigation }) {
  return (
    <View style={s.screen}>
      {/* Back */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={s.back}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.title}>👶 Estándares de seguridad de los niños (CSAE)</Text>
        <Text style={s.updated}>
          Política de protección infantil, controles de prevención y contacto oficial de El Enlace.
        </Text>

        <Text style={s.sectionTitle}>1) Alcance y compromiso</Text>
        <Text style={s.text}>
          El Enlace prohíbe estrictamente cualquier contenido, conducta o actividad que involucre
          abuso sexual infantil (CSAE) o ponga en riesgo a menores. Aplicamos medidas preventivas,
          moderación y acciones inmediatas ante reportes.
        </Text>

        <Text style={s.sectionTitle}>2) Contenido prohibido</Text>
        <Text style={s.text}>• Material de abuso sexual infantil en cualquier forma.</Text>
        <Text style={s.text}>• Almacenamiento, distribución o intercambio de CSAM.</Text>
        <Text style={s.text}>
          • Solicitudes, grooming, sextorsión, coerción o contacto sexual con menores.
        </Text>
        <Text style={s.text}>
          • Publicaciones que normalicen, promuevan o faciliten cualquier conducta de riesgo hacia
          menores.
        </Text>

        <Text style={s.sectionTitle}>3) Controles preventivos</Text>
        <Text style={s.text}>• Moderación activa, revisión de reportes y bloqueo de cuentas/recursos.</Text>
        <Text style={s.text}>
          • Políticas y revisión de contenido para desalentar conductas de riesgo.
        </Text>
        <Text style={s.text}>
          • Canales de reporte visibles y accesibles para usuarios y terceros.
        </Text>

        <Text style={s.sectionTitle}>4) Acciones ante una denuncia válida</Text>
        <Text style={s.text}>• Retiro inmediato del contenido y bloqueo preventivo de la cuenta.</Text>
        <Text style={s.text}>
          • Preservación de evidencias y reporte a las autoridades competentes.
        </Text>
        <Text style={s.text}>
          • Cooperación con organismos y plataformas para prevenir la redistribución.
        </Text>

        <Text style={s.sectionTitle}>5) Contacto y denuncias</Text>
        <Text style={s.text}>
          Correo de contacto oficial:{' '}
          <Text
            style={s.link}
            onPress={() =>
              openLink(`mailto:${CONTACT_EMAIL}?subject=Denuncia%20CSAE&body=Describe%20el%20caso%20y%20adjunta%20evidencia.`)
            }
          >
            {CONTACT_EMAIL}
          </Text>
        </Text>
        <Text style={[s.text, { marginTop: 6 }]}>
          Estándares de seguridad infantil de Google Play: ver guía.
        </Text>

        {/* Botones */}
        <TouchableOpacity style={s.webBtn} onPress={() => openLink(CSAE_URL)}>
          <Ionicons name="open-outline" size={18} color="#000" />
          <Text style={s.webBtnText}>Ver esta política en la web</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.webBtn, { marginTop: 10 }]}
          onPress={() =>
            openLink(`mailto:${CONTACT_EMAIL}?subject=Denuncia%20CSAE&body=Describe%20el%20caso%20y%20adjunta%20evidencia.`)
          }
        >
          <Ionicons name="mail-outline" size={18} color="#000" />
          <Text style={s.webBtnText}>Denunciar por correo</Text>
        </TouchableOpacity>

        <Text style={s.footerDate}>Última actualización: 04/09/2025 • © El Enlace</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000', paddingTop: 30 },
  back: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
  container: { padding: 20, paddingTop: 60, paddingBottom: 120 },
  title: { fontSize: 22, color: ACCENT, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  updated: { color: '#9aa', fontSize: 12, marginBottom: 12, textAlign: 'center' },
  sectionTitle: { color: ACCENT, fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  text: { color: '#ccc', fontSize: 14, lineHeight: 22, marginBottom: 6, textAlign: 'justify' },
  link: { color: '#4DA6FF', textDecorationLine: 'underline' },
  webBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  webBtnText: { color: '#000', fontWeight: '700' },
  footerDate: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
