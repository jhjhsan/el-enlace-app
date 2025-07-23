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

export default function TalentRegisterForm({
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
  isMinor,
  setIsMinor,
  representativeName,
  setRepresentativeName,
  representativeID,
  setRepresentativeID,
  representativeEmail,
  setRepresentativeEmail,
  relationship,
  setRelationship,
  legalConsent,
  setLegalConsent,
  isLoading,
  handleRegisterPress,
  navigation,
}) {
  const handleSubmit = () => {
    console.log('📧 Email:', email);
    console.log('📧 Representative Email:', representativeEmail);
    if (!email || !isValidEmail(email)) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido.');
      return;
    }
    if (isMinor && (!representativeEmail || !isValidEmail(representativeEmail))) {
      Alert.alert('Error', 'Por favor, ingresa un correo válido para el representante.');
      return;
    }
    handleRegisterPress();
  };

  return (
    <>
      <View style={{ position: 'absolute', top: 15, left: 0, zIndex: 10 }}>
        <BackButton color="#fff" />
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 60,
          paddingHorizontal: 10,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
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

        <View style={{ position: 'relative' }}>
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
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#D8A353"
            />
          </TouchableOpacity>
        </View>

        <View style={{ position: 'relative' }}>
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
            <Ionicons
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#D8A353"
            />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => setIsMinor(!isMinor)} style={styles.checkbox}>
            {isMinor && <View style={styles.checkboxChecked} />}
          </TouchableOpacity>
          <Text style={styles.checkboxText}>
            Soy menor de edad (14 años o menos) y cuento con un representante legal
          </Text>
        </View>

        {isMinor && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nombre del representante legal"
              placeholderTextColor="#999"
              value={representativeName}
              onChangeText={setRepresentativeName}
            />
            <TextInput
              style={styles.input}
              placeholder="RUT o ID del representante"
              placeholderTextColor="#999"
              value={representativeID}
              onChangeText={setRepresentativeID}
            />
            <View style={{ position: 'relative', marginBottom: 0 }}>
              <TextInput
                style={styles.input}
                placeholder="Correo del representante"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={representativeEmail}
                onChangeText={setRepresentativeEmail}
              />
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={representativeEmail && isValidEmail(representativeEmail) ? '#00ff99' : '#777'}
                style={{ position: 'absolute', right: 10, top: 12 }}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Relación (madre, padre, tutor, etc.)"
              placeholderTextColor="#999"
              value={relationship}
              onChangeText={setRelationship}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => setLegalConsent(!legalConsent)} style={styles.checkbox}>
                {legalConsent && <View style={styles.checkboxChecked} />}
              </TouchableOpacity>
              <Text style={styles.checkboxText}>
                Confirmo que mi representante legal ha autorizado este registro
              </Text>
            </View>
          </>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => setAcceptedPolicies(!acceptedPolicies)} style={styles.checkbox}>
            {acceptedPolicies && <View style={styles.checkboxChecked} />}
          </TouchableOpacity>
          <Text style={styles.checkboxText}>
            Acepto los{' '}
            <Text style={styles.linkText} onPress={() => navigation.navigate('TermsAndConditionsScreen')}>
              Términos
            </Text>{' '}
            y la{' '}
            <Text style={styles.linkText} onPress={() => navigation.navigate('PrivacyPolicyScreen')}>
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
    </>
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
    borderColor: '#D8A353',
    borderWidth: 0.5,
    marginBottom: 8,
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
    color: '#4DA6FF',
    textDecorationLine: 'underline',
  },
};