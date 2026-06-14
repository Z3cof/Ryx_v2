import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { useTranslation } from '../../../hooks/useTranslation';

interface RegisterOtpStepProps {
  handleBackToForm: () => void;
  registering: boolean;
  resending: boolean;
  otpCode: string;
  setOtpCode: (v: string) => void;
  devOtpHint: string | null;
  error: string | null;
  otpReady: boolean;
  handleCreateAccountWithOtp: () => void;
  handleResendOtp: () => void;
  navigateWithExit: (path: string) => void;
  styles: any;
}

export function RegisterOtpStep({
  handleBackToForm,
  registering,
  resending,
  otpCode,
  setOtpCode,
  devOtpHint,
  error,
  otpReady,
  handleCreateAccountWithOtp,
  handleResendOtp,
  navigateWithExit,
  styles,
}: RegisterOtpStepProps) {
  const { ui, colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <>
      <Pressable
        style={styles.backEditRow}
        onPress={handleBackToForm}
        hitSlop={12}
        disabled={registering || resending}
      >
        <Ionicons name="chevron-back" size={22} color={colors.primary.main} />
        <Text style={styles.backEditLabel}>{t('auth.registerBackEditForm')}</Text>
      </Pressable>
      <Text style={styles.otpTitle}>{t('auth.registerOtpScreenTitle')}</Text>
      <Text style={styles.otpSubtitle}>{t('auth.registerOtpScreenSubtitle')}</Text>
      <Text style={styles.label}>{t('auth.registerOtpLabel')}</Text>
      <TextInput
        style={styles.otpInput}
        placeholder="000000"
        placeholderTextColor={ui.textTertiary}
        value={otpCode}
        onChangeText={(x) => setOtpCode(x.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        editable={!registering}
      />
      {devOtpHint ? (
        <Text style={styles.devOtpHint}>
          {t('auth.registerDevOtpHint', { code: devOtpHint })}
        </Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && otpReady && !registering && styles.primaryButtonPressed,
          (!otpReady || registering) && styles.primaryButtonDisabled,
          registering && { opacity: 0.88 },
        ]}
        onPress={handleCreateAccountWithOtp}
        disabled={registering || !otpReady}
      >
        {registering ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text
            style={[
              styles.primaryButtonText,
              !otpReady && styles.primaryButtonTextDisabled,
            ]}
          >
            {t('auth.registerOtpCreateAccount')}
          </Text>
        )}
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.secondaryOutlineBtn,
          pressed && { opacity: 0.88 },
        ]}
        onPress={handleResendOtp}
        disabled={resending || registering}
      >
        {resending ? (
          <ActivityIndicator color={colors.primary.main} size="small" />
        ) : (
          <Text style={styles.secondaryOutlineBtnText}>
            {t('auth.registerOtpResend')}
          </Text>
        )}
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
