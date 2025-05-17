import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveUserProfile } from '../utils/profileStorage';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const SPACER = (width - CARD_WIDTH) / 2;

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
    price: '$2.990 CLP/mes',
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
    price: '$7.990 CLP/mes',
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
  const [membershipType, setMembershipType] = useState('free');

  useEffect(() => {
    const loadMembership = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const user = JSON.parse(json);
        setMembershipType(user.membershipType || 'free');
      }
    };
    loadMembership();
  }, []);

  const handleSelect = async (plan) => {
    const json = await AsyncStorage.getItem('userProfile');
    if (!json) return;
    const user = JSON.parse(json);
    const updatedUser = { ...user, membershipType: plan };

    await saveUserProfile(updatedUser, plan, setUserData, setIsLoggedIn, true);

    if (plan === 'elite') {
      navigation.replace('CompleteElite');
    } else if (plan === 'pro') {
      navigation.replace('CompleteProfile');
    } else {
      navigation.replace('Dashboard');
    }
  };

  const renderPlan = ({ item }) => (
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

      {item.id === membershipType ? (
        <View style={styles.activePlan}>
          <Text style={[styles.buttonText, { color: '#aaa' }]}>🌟 Plan activo</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => {
            if (item.id === 'pro') {
              navigation.navigate('PaymentPro');
            } else if (item.id === 'elite') {
              navigation.navigate('PaymentElite');
            } else {
              handleSelect(item.id); // solo el Free se activa directo
            }
          }}          
        >
          <Text style={styles.buttonText}>💳 Elegir Plan</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.header}>Planes de Membresía — El Enlace</Text>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        horizontal
        snapToInterval={CARD_WIDTH + 20}
        decelerationRate="fast"
        contentContainerStyle={styles.carousel}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={3}
        removeClippedSubviews={true}
        renderItem={renderPlan}
      />
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
    width: 140,
    height: 140,
    alignSelf: 'center',
    marginBottom: 0,
  },
  header: {
    color: '#D8A353',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
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
    paddingVertical: 15,
    marginHorizontal: 10,
    shadowColor: '#D8A353',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    minHeight: 100,
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
});
