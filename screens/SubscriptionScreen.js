import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveUserProfile } from '../utils/profileStorage';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

const plans = [
  {
    id: 'free',
    title: '🎬 Plan Free',
    price: 'Gratis',
    benefits: [
      '✅ Explorar perfiles básicos (sin fotos/videos)',
      '✅ Postular a castings (2/mes)',
      '✅ Mensajería básica (1/semana, 100 caracteres)',
      '✅ Notificaciones inteligentes',
      '✅ Verificación con correo y CAPTCHA',
      '✅ Publicar hasta 2 servicios por semana',
      '❌ Ver fotos y videos completos',
      '❌ Contactar perfiles directamente',
      '❌ Publicar castings',
      '❌ Descargar postulaciones',
      '❌ Filtros avanzados o estadísticas',
      '❌ Soporte prioritario',
    ],
  },
{
  id: 'pro',
  title: '🏆 Plan Pro',
  price: '1er mes GRATIS\n$3.490 CLP/mes\n$29.990 CLP/año',
    benefits: [
      '✅ Todo lo de Free',
      '✅ Postular a castings y servicios (ilimitado)',
      '✅ Ver fotos y videos completos de perfiles',
      '✅ Mensajería interna ilimitada',
      '✅ Contacto directo (correo, chat, Instagram)',
      '✅ Acceso a Focus Group',
      '✅ Historial de postulaciones',
      '✅ Notificaciones inteligentes de casting',
      '✅ Publicar servicios (sin límite)',
      '🔒 Aparecer como anuncio destacado (requiere promoción)',
      '❌ Publicar castings',
      '❌ Descargar postulaciones',
      '❌ Filtros avanzados o estadísticas',
      '❌ Soporte prioritario',
    ],
  },
  {
    id: 'elite',
    title: '👑 Plan Elite',
    price: '1er mes GRATIS\n3 meses a $9.990 (50% dcto)\n$19.990 CLP/mes\n$149.900 CLP/año',
    benefits: [
      '✅ Todo lo de Pro',
      '✅ Publicar castings y servicios ilimitados',
      '✅ Descargar postulaciones en Excel/PDF',
      '✅ Filtros avanzados por edad, región, habilidades',
      '✅ Acceso a búsqueda por habilidades específicas',
      '✅ Envío automático de notificaciones a talentos compatibles',
      '✅ Uso de IA para leer castings desde .docx/imágenes',
      '✅ Autocompletar castings con IA (documentos o fotos)',
      '✅ Aparecer como anuncio destacado (sin pagar)',
      '✅ Badge dorado y visibilidad destacada',
      '✅ Soporte prioritario (respuesta en 24h)',
      '🕒 Próximamente: estadísticas de visitas a tu perfil/castings',
    ],
  },
];

export default function SubscriptionScreen() {
 

  const navigation = useNavigation();
  const { setUserData, setIsLoggedIn, userData } = useUser();

   console.log('userData:', userData);

  const membershipType = userData?.membershipType || 'free';
  const isInTrial = () => {
  if (!userData?.trialEndsAt) return false;
  const now = new Date();
  const trialEnd = new Date(userData.trialEndsAt);
  return now < trialEnd;
};
useEffect(() => {
  const checkTrialStatus = async () => {
    if (
      userData?.membershipType === 'pro' &&
      !userData?.hasPaid &&
      userData?.trialEndsAt
    ) {
      const now = new Date();
      const trialEnd = new Date(userData.trialEndsAt);

      if (now > trialEnd) {
        console.log('⏰ Fin del mes de prueba. Pasando a plan Free...');
        const updatedData = {
          ...userData,
          membershipType: 'free',
          trialEndsAt: null,
        };

        await saveUserProfile(
          updatedData,
          'free',
          setUserData,
          setIsLoggedIn,
          false
        );
      }
    }
  };

  checkTrialStatus();
}, []);

  const [showModal, setShowModal] = useState(false);

const renderPlan = ({ item }) => {
  const isCurrent = item.id === membershipType;
  const isElite = item.id === 'elite';
  const isAgency = userData?.accountType === 'agency';

  return (
    <View style={styles.planCard}>
      <Text style={styles.planTitle}>{item.title}</Text>

      {item.benefits.map((b, i) => {
        const isLocked = b.includes('❌');
        const displayText = isLocked ? b.replace('❌', '🔒') : b;

        return (
          <Text
            key={i}
            style={[
              styles.bullet,
              { color: isLocked ? '#777' : '#ccc', textAlign: 'left' },
            ]}
          >
            {displayText}
          </Text>
        );
      })}

      <Text style={styles.price}>{item.price}</Text>
      <View style={{ flexGrow: 1 }} />

<View style={{ marginTop: item.id === 'free' ? 50 : 20 }}>
  {item.id === 'elite' && !isAgency ? (
    <View style={styles.activePlan}>
      <Text style={[styles.buttonText, { color: '#aaa', textAlign: 'center' }]}>
        🔒 Para ser Elite debes registrarte como agencia o productora
      </Text>
    </View>
 ) : item.id === 'pro' && userData?.membershipType === 'pro' ? (
  isInTrial() ? (
    <View>
      <View style={styles.activePlan}>
        <Text style={[styles.buttonText, { color: '#D8A353' }]}>🌟 Mes de prueba activo</Text>
      </View>
      <TouchableOpacity
        style={[styles.selectButton, { marginTop: 10 }]}
        onPress={() => {
          console.log('Usuario quiere pagar antes del fin de prueba');
          navigation.navigate('PaymentPro', { goTo: 'CompleteProfile' });
        }}
      >
        <Text style={styles.buttonText}>💳 Activar plan Pro ahora</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.activePlan}>
      <Text style={[styles.buttonText, { color: '#00ff99' }]}>🌟 Plan activo</Text>
    </View>
  )

  ) : item.id === 'pro' && membershipType !== 'pro' ? (
    <TouchableOpacity
      style={styles.selectButton}
      onPress={() => {
        console.log('NAVEGANDO A PAYMENT PRO');
        navigation.navigate('PaymentPro', { goTo: 'CompleteProfile' });
      }}
    >
      <Text style={styles.buttonText}>💳 Activar plan Pro</Text>
    </TouchableOpacity>
  ) : item.id === 'free' && membershipType === 'free' ? (
    <View style={styles.activePlan}>
      <Text style={[styles.buttonText, { color: '#D8A353' }]}>✅ Plan Free activo</Text>
    </View>
  ) : item.id === 'elite' && isAgency && membershipType === 'elite' && String(userData?.hasPaid) === 'true' ? (
    <View style={styles.activePlan}>
      <Text style={[styles.buttonText, { color: '#00ff99' }]}>👑 Plan Elite activo</Text>
    </View>
  ) : (
    <TouchableOpacity
      style={[
        styles.selectButton,
        item.id === 'elite' && { backgroundColor: '#D8A353' },
      ]}
      onPress={() => {
        if (item.id === 'elite') {
          if (userData?.accountType === 'agency') {
            navigation.navigate('PaymentElite', { goTo: 'CompleteElite' });
          } else {
            setShowModal(true);
          }
        }
      }}
    >
      <Text
        style={[
          styles.buttonText,
          item.id === 'elite' && { color: '#000' },
        ]}
      >
        💳 Activar plan {item.id === 'elite' ? 'Elite' : ''}
      </Text>
    </TouchableOpacity>
  )}
</View>
    </View>
  );
};

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.header}>Planes de Membresía — El Enlace</Text>
{userData?.membershipType === 'elite' && userData?.hasPaid === false && (
  <Text style={styles.bannerText}>
    🔥 ¡Impulsa tu agencia! Publica castings, descarga postulaciones, y destaca con IA.
  </Text>
)}
      {userData?.membershipType === 'elite' && userData?.hasPaid === true && (
        <Text style={{ color: '#D8A353', textAlign: 'center', marginBottom: 10 }}>
          👑 Ya tienes acceso al Plan Elite. Aquí puedes repasar sus beneficios.
        </Text>
      )}

      <FlatList
      data={
  userData?.membershipType === 'elite'
    ? plans.filter((plan) => plan.id === 'elite') // 👈 solo Plan Elite
    : plans
}
        keyExtractor={(item) => item.id}
        horizontal
        snapToInterval={CARD_WIDTH + 20}
        decelerationRate="fast"
     contentContainerStyle={[
  styles.carousel,
  userData?.membershipType === 'elite' && {
    justifyContent: 'center',
    paddingLeft: 20, // 👈 Ajuste visual sutil hacia la derecha
  },
]}

        showsHorizontalScrollIndicator={false}
        renderItem={renderPlan}
      />

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🚫 Plan Elite exclusivo</Text>
            <Text style={styles.modalText}>
              Para acceder al plan Elite debes registrarte como una agencia o productora.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={{ color: '#000', fontWeight: 'bold' }}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 30,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
  },
  header: {
    color: '#D8A353',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  carousel: {
    paddingHorizontal: 10,
  },
  planCard: {
    backgroundColor: '#111',
    width: CARD_WIDTH,
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 14,
    padding: 15,
    marginHorizontal: 10,
  },
  planTitle: {
    color: '#D8A353',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  bullet: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  price: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  selectButton: {
    backgroundColor: '#D8A353',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 20,
  },
  activePlan: {
    backgroundColor: '#262626',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 20,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#1B1B1B',
    padding: 20,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
    width: '80%',
  },
  modalTitle: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    color: '#ccc',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#D8A353',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  bannerText: {
  color: '#D8A353',
  fontSize: 12,
  textAlign: 'center',
  marginBottom: 12,
  marginHorizontal: 20,
  fontWeight: '600',
},
});
