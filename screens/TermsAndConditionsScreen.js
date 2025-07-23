import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TermsAndConditionsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

<ScrollView contentContainerStyle={styles.content}>
  <Text style={styles.title}>Términos y Condiciones de Uso</Text>

  <Text style={styles.paragraph}>
    Al utilizar la aplicación "El Enlace", el usuario acepta los siguientes términos y condiciones. Recomendamos leer detenidamente este documento antes de continuar.
  </Text>

  <Text style={styles.paragraph}>
    1. Esta plataforma está destinada exclusivamente a conectar talentos, profesionales, prestadores de servicios audiovisuales y agencias/productoras de forma responsable y profesional.
  </Text>

  <Text style={styles.paragraph}>
    2. Cada usuario es responsable de la veracidad de la información proporcionada en su perfil, así como del contenido que publica (como fotos, videos o anuncios).
  </Text>

  <Text style={styles.paragraph}>
    3. Está estrictamente prohibido subir contenido ofensivo, engañoso, discriminatorio o que infrinja derechos de autor o de terceros.
  </Text>

  <Text style={styles.paragraph}>
    4. El equipo de "El Enlace" se reserva el derecho de suspender, eliminar o restringir cuentas que incumplan estos términos, sin previo aviso.
  </Text>

  <Text style={styles.paragraph}>
    5. No se permite subir contenido ofensivo, violento, sexualmente explícito, discriminatorio, ni que infrinja derechos de autor o privacidad de terceros. "El Enlace" utiliza herramientas de inteligencia artificial para analizar imágenes, videos y textos con el fin de mantener una comunidad segura. El contenido que incumpla estas normas podrá ser bloqueado automáticamente y el perfil podrá quedar sujeto a revisión o suspensión.
  </Text>

  <Text style={styles.paragraph}>
    6. "El Enlace" es una plataforma tecnológica que facilita el contacto entre talentos y empresas del rubro audiovisual. No constituye un sindicato, gremio, asociación profesional ni representa ni negocia en nombre de sus usuarios. Las relaciones laborales o comerciales que puedan surgir entre usuarios son de exclusiva responsabilidad de las partes involucradas.
  </Text>

  <Text style={styles.paragraph}>
    7. Las condiciones de uso, membresías y funciones disponibles pueden cambiar con el tiempo. El acceso a ciertos servicios dependerá del plan contratado por el usuario.
  </Text>

  <Text style={styles.paragraph}>
    8. "El Enlace" no se hace responsable por tratos, acuerdos o conflictos que ocurran entre usuarios fuera de la plataforma.
  </Text>

  <Text style={styles.paragraph}>
    Para cualquier duda o consulta legal, puedes escribirnos a: soporte@elenlace.cl
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
    paddingTop: 40,
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
