// screens/MembershipPlansScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function MembershipPlansScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>📊 Planes de membresía - El Enlace (CLP)</Text>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.cell, styles.header]}>Funcionalidad</Text>
            <Text style={[styles.cell, styles.header]}>Free 🎨</Text>
            <Text style={[styles.cell, styles.header]}>Pro 🏆</Text>
            <Text style={[styles.cell, styles.header]}>Elite 👑</Text>
          </View>

          {[
            ['Explorar perfiles', '✅', '✅', '✅'],
            ['Ver fotos y videos completos', '❌', '✅', '✅'],
            ['Contactar perfiles', '❌', '✅', '✅'],
            ['Postular a castings/servicios', '❌', '✅', '✅'],
            ['Publicar casting o servicio', '❌', '❌', '✅'],
            ['Descargar postulaciones en Excel/PDF', '❌', '❌', '✅'],
            ['Acceso a filtros avanzados', '❌', '✅', '✅'],
            ['Descuento en publicidad pagada', '❌', '❌', '✅ (10%)'],
            ['Acceso prioritario a convocatorias', '❌', '✅', '✅'],
            ['Soporte preferencial', '❌', '✅', '✅'],
            ['Acceso completo a actualizaciones', '❌', '✅', '✅'],
            ['Precio mensual', 'Gratis 💸', '$2.990 CLP', '$7.990 CLP'],
          ].map(([feature, free, pro, elite], index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.cell}>{feature}</Text>
              <Text style={styles.cell}>{free}</Text>
              <Text style={styles.cell}>{pro}</Text>
              <Text style={styles.cell}>{elite}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.subtitle}>Elige tu plan y desbloquea beneficios exclusivos:</Text>

        <TouchableOpacity style={styles.proButton} onPress={() => navigation.navigate('PaymentPro')}>
          <Text style={styles.proButtonText}>Elegir Pro 🏆 - $2.990 CLP</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.eliteButton} onPress={() => navigation.navigate('PaymentElite')}>
          <Text style={styles.eliteButtonText}>Elegir Elite 👑 - $7.990 CLP</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingBottom: 100,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  subtitle: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  table: {
    borderWidth: 1,
    borderColor: '#D8A353',
    borderRadius: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#D8A353',
  },
  row: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#D8A353',
  },
  cell: {
    flex: 1,
    padding: 10,
    color: '#fff',
    textAlign: 'center',
    fontSize: 12,
  },
  header: {
    fontWeight: 'bold',
    color: '#000',
  },
  proButton: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    borderWidth: 1,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 15,
  },
  eliteButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 10,
  },
  proButtonText: {
    color: '#D8A353',
    fontWeight: 'bold',
    fontSize: 14,
  },
  eliteButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
