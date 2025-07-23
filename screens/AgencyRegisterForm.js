import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import { navigate } from '../navigation/NavigationService';

export default function AgencyRegisterForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  acceptedPolicies,
  setAcceptedPolicies,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  passwordStrength,
  handlePasswordChange,
  getStrengthColor,
  isValidEmail,
  representativeName,
  setRepresentativeName,
  isLoading,
  handleRegisterPress,
  setShowForm,
  membershipType,
  setMembershipType,
}) {
  const handleSubmit = () => {
    console.log('📧 Email:', email);
    if (!email || !isValidEmail(email)) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido.');
      return;
    }
    handleRegisterPress();
  };

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: 60,
        paddingHorizontal: 10,
        paddingBottom: 40,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ position: 'absolute', top: 0, left: -20, zIndex: 10 }}>
        <BackButton color="#fff" />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nombre de la empresa"
        placeholderTextColor="#999"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Representante legal"
        placeholderTextColor="#999"
        value={representativeName}
        onChangeText={setRepresentativeName}
      />

      <View style={{ position: 'relative', marginBottom: 0 }}>
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={email && isValidEmail(email) ? '#00ff99' : '#777'}
          style={{ position: 'absolute', right: 10, top: 12 }}
        />
      </View>

      <View style={{ position: 'relative', marginBottom: 0 }}>
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={handlePasswordChange}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={{ position: 'absolute', right: 10, top: 12 }}
        >
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#D8A353" />
        </TouchableOpacity>
      </View>

      <View style={{ position: 'relative', marginBottom: 10 }}>
        <TextInput
          style={styles.input}
          placeholder="Confirmar contraseña"
          placeholderTextColor="#999"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={{ position: 'absolute', right: 10, top: 12 }}
        >
          <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#D8A353" />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <TouchableOpacity
          onPress={() => setAcceptedPolicies(!acceptedPolicies)}
          style={styles.checkbox}
        >
          {acceptedPolicies && <View style={styles.checkboxChecked} />}
        </TouchableOpacity>
        <Text style={styles.checkboxText}>
          Acepto los{' '}
          <Text style={styles.linkText} onPress={() => navigate('TermsAndConditions')}>
            Términos
          </Text>{' '}
          y la{' '}
          <Text style={styles.linkText} onPress={() => navigate('PrivacyPolicy')}>
            Política de Privacidad
          </Text>.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={isLoading || !acceptedPolicies}
      >
        {isLoading ? (
          <>
            <ActivityIndicator color="#fff" />
            <Text style={styles.buttonText}>  Registrando...</Text>
          </>
        ) : (
          <Text style={styles.buttonText}>Registrarse</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = {
  input: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    paddingRight: 40,
    fontSize: 14,
    borderColor: '#444',
    borderWidth: 1,
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#D8A353',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 12,
    height: 12,
    backgroundColor: '#D8A353',
    borderRadius: 2,
  },
  checkboxText: {
    color: '#ccc',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  linkText: {
    color: '#D8A353',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
};