import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCountryCallingCode, type CountryCode } from 'libphonenumber-js';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { useTranslation } from '../../../hooks/useTranslation';

interface RegisterFormStepProps {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  countryIso: CountryCode;
  setCountryModalVisible: (v: boolean) => void;
  nationalPhone: string;
  setNationalPhone: (v: string) => void;
  phoneDetectionLine: string | null;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((prev: boolean) => boolean)) => void;
  passwordStrength: 'none' | 'weak' | 'medium' | 'strong';
  error: string | null;
  sendingCode: boolean;
  canContinue: boolean;
  handleContinueToOtp: () => void;
  handleTestConnection: () => void;
  navigateWithExit: (path: string) => void;
  styles: any;
}

export function RegisterFormStep({
  name,
  setName,
  email,
  setEmail,
  countryIso,
  setCountryModalVisible,
  nationalPhone,
  setNationalPhone,
  phoneDetectionLine,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  passwordStrength,
  error,
  sendingCode,
  canContinue,
  handleContinueToOtp,
  handleTestConnection,
  navigateWithExit,
  styles,
}: RegisterFormStepProps) {
  const { ui, colors, spacing } = useAppTheme();
  const { t } = useTranslation();

  return (
    <>
      <Text style={styles.title}>Créer un compte</Text>
      <Text style={styles.subtitle}>Rejoignez Ryx en quelques secondes.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Nom complet</Text>
        <TextInput
          style={styles.input}
          placeholder="Ahmad Baba Dicko"
          placeholderTextColor={ui.textTertiary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="exemple@email.com"
          placeholderTextColor={ui.textTertiary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>{t('auth.registerPhoneLabel')}</Text>
        <View style={styles.phoneRow}>
          <Pressable
            style={styles.countryBtn}
            onPress={() => setCountryModalVisible(true)}
          >
            <Text style={styles.countryBtnText}>
              {countryIso} +{getCountryCallingCode(countryIso)}
            </Text>
            <Ionicons name="chevron-down" size={16} color={ui.textSecondary} />
          </Pressable>
          <TextInput
            style={[styles.input, styles.nationalInput]}
            placeholder={t('auth.registerPhoneNationalHint')}
            placeholderTextColor={ui.textTertiary}
            value={nationalPhone}
            onChangeText={setNationalPhone}
            keyboardType="phone-pad"
          />
        </View>
        {phoneDetectionLine ? (
          <Text style={styles.phoneDetectionHint}>{phoneDetectionLine}</Text>
        ) : null}

        <Text style={styles.label}>Mot de passe</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, styles.inputPassword]}
            placeholder="••••••••"
            placeholderTextColor={ui.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
          >
            <Text style={styles.eyeButtonText}>
              {showPassword ? 'Masquer' : 'Afficher'}
            </Text>
          </Pressable>
        </View>

        {password.length > 0 ? (
          <View style={styles.pwdMeterWrap}>
            <View style={styles.pwdMeterRow}>
              <View
                style={[
                  styles.pwdMeterSeg,
                  styles.pwdMeterSegMuted,
                  passwordStrength !== 'none' && {
                    backgroundColor:
                      passwordStrength === 'weak'
                        ? '#dc2626'
                        : passwordStrength === 'medium'
                        ? '#ea580c'
                        : '#16a34a',
                  },
                ]}
              />
              <View
                style={[
                  styles.pwdMeterSeg,
                  styles.pwdMeterSegMuted,
                  (passwordStrength === 'medium' ||
                    passwordStrength === 'strong') && {
                    backgroundColor:
                      passwordStrength === 'medium' ? '#ea580c' : '#16a34a',
                  },
                ]}
              />
              <View
                style={[
                  styles.pwdMeterSeg,
                  styles.pwdMeterSegMuted,
                  passwordStrength === 'strong' && { backgroundColor: '#16a34a' },
                ]}
              />
            </View>
            <Text
              style={[
                styles.pwdMeterLabel,
                passwordStrength === 'weak' && { color: '#dc2626' },
                passwordStrength === 'medium' && { color: '#ea580c' },
                passwordStrength === 'strong' && { color: '#16a34a' },
              ]}
            >
              {passwordStrength === 'weak'
                ? t('auth.registerPasswordStrengthWeak')
                : passwordStrength === 'medium'
                ? t('auth.registerPasswordStrengthMedium')
                : t('auth.registerPasswordStrengthStrong')}
            </Text>
          </View>
        ) : null}

        <Text style={styles.label}>Confirmer le mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={ui.textTertiary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && canContinue && !sendingCode && styles.primaryButtonPressed,
            !canContinue && !sendingCode && styles.primaryButtonDisabled,
            sendingCode && { opacity: 0.88 },
          ]}
          onPress={handleContinueToOtp}
          disabled={sendingCode || !canContinue}
        >
          {sendingCode ? (
            <View style={styles.primaryButtonLoadingInner}>
              <ActivityIndicator color={colors.white} size="small" />
              <Text
                style={[
                  styles.primaryButtonText,
                  { marginLeft: spacing[2] },
                ]}
              >
                {t('auth.registerSendingOtp')}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.primaryButtonText,
                !canContinue && styles.primaryButtonTextDisabled,
              ]}
            >
              {t('auth.registerContinueToCode')}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <Pressable
          style={({ pressed }) => [
            styles.socialButton,
            pressed && styles.socialButtonPressed,
          ]}
          onPress={() => {}}
        >
          <Text style={styles.socialButtonText}>Google</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.socialButton,
            pressed && styles.socialButtonPressed,
          ]}
          onPress={() => {}}
        >
          <Text style={styles.socialButtonText}>Facebook</Text>
        </Pressable>
      </View>

      <Pressable onPress={handleTestConnection} style={styles.testLinkWrap}>
        <Text style={styles.testLink}>Tester la connexion au serveur</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Déjà un compte ? </Text>
        <Pressable hitSlop={8} onPress={() => navigateWithExit('/auth/login')}>
          <Text style={styles.footerLink}>Se connecter</Text>
        </Pressable>
      </View>
    </>
  );
}
