import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LegalNoticeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Aviso Legal</Text>

        <Text style={styles.paragraph}>
          Esta aplicación, "El Enlace", es propiedad de Jhon Alberto Santana Santiago, titular del dominio elenlace.cl. El uso de esta plataforma implica la aceptación de los términos legales aquí descritos.
        </Text>

        <Text style={styles.paragraph}>
          La finalidad de esta app es facilitar la conexión entre talentos, prestadores de servicios audiovisuales, agencias, productoras y proyectos del rubro audiovisual y artístico.
        </Text>

        <Text style={styles.paragraph}>
          Todos los elementos que conforman esta aplicación —incluyendo diseño, estructura, código, imágenes, nombre comercial y contenido— están protegidos por la legislación vigente en Chile, así como por tratados internacionales de propiedad intelectual.
        </Text>

        <Text style={styles.paragraph}>
          Se prohíbe expresamente la reproducción total o parcial de cualquier parte de la plataforma sin autorización escrita del titular. El uso indebido de estos elementos podrá ser perseguido por las vías legales correspondientes.
        </Text>

        <Text style={styles.paragraph}>
          Para contacto legal, reportes o reclamaciones, puedes escribirnos a: soporte@elenlace.cl
        </Text>

        <Text style={styles.updateText}>Última actualización: mayo 2025</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 30,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D8A353',
    marginBottom: 20,
    textAlign: 'center',
  },
  paragraph: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 15,
    lineHeight: 22,
    textAlign: 'justify',
  },
  updateText: {
    marginTop: 30,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});
