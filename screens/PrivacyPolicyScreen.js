import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen({ navigation }) {
    const handleOpenLink = () => {
        Linking.openURL('https://www.privacypolicies.com/live/b5c06e9d-3237-4cdd-9e7b-0ab2ee712ff3');
      };
      
  return (
    <View style={styles.container}>
      <Ionicons
        name="arrow-back"
        size={28}
        color="#fff"
        style={styles.backIcon}
        onPress={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Resumen de Política de Privacidad</Text>

        <Text style={styles.text}>
          Esta Política de Privacidad describe cómo recopilamos, usamos y protegemos la información personal
          que proporcionas al utilizar la aplicación "El Enlace".
        </Text>

        <Text style={styles.sectionTitle}>1. Información que recopilamos</Text>
        <Text style={styles.text}>
          Recopilamos datos como nombre, correo electrónico, imágenes, videos, información de contacto y ubicación
          para personalizar tu experiencia y conectar talentos con agencias.
        </Text>

        <Text style={styles.sectionTitle}>2. Uso de la información</Text>
        <Text style={styles.text}>
          Utilizamos tus datos para crear tu perfil, facilitar contactos profesionales, mejorar nuestros servicios
          y enviarte notificaciones relevantes según tu actividad y perfil.
        </Text>

        <Text style={styles.sectionTitle}>3. Protección de datos</Text>
        <Text style={styles.text}>
          Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal
          contra accesos no autorizados, alteraciones o pérdidas.
        </Text>

        <Text style={styles.sectionTitle}>4. Terceros</Text>
        <Text style={styles.text}>
          No vendemos tu información. Solo compartimos datos con terceros cuando es necesario para el funcionamiento
          de la app (ej. servicios de hosting o moderación automática).
        </Text>

        <Text style={styles.sectionTitle}>5. Tus derechos</Text>
        <Text style={styles.text}>
          Puedes acceder, modificar o eliminar tus datos personales en cualquier momento desde tu cuenta o escribiéndonos.
        </Text>

        <Text style={styles.text}>
          Para consultas relacionadas con privacidad, puedes escribirnos a: soporte@elenlace.cl
        </Text>

        <TouchableOpacity onPress={handleOpenLink}>
          <Text style={[styles.text, { color: '#4DA6FF', marginTop: 20, textAlign: 'center' }]}>
            Ver política completa en línea
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 30 },
  backIcon: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
  content: { padding: 20, paddingTop: 60 },
  title: { color: '#D8A353', fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 20 },
  text: { color: '#ccc', fontSize: 16, lineHeight: 24, marginTop: 10 },
});
