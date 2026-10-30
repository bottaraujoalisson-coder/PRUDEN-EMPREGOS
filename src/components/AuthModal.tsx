import React, { useState, useEffect } from 'react';
import {
  smartRegisterWithEmailPassword,
  smartSignInWithEmailPassword,
  smartSignInWithGoogle,
  smartResetPassword,
} from '../services/directCloudAuth';
import {
  saveUserProfile,
  getUserProfile,
  checkIsAdmin,
  checkDocumentAvailability,
} from '../services/usersService';
import { lookupAddressByCep } from '../services/cepService';
import { lookupCompanyByCnpj, CnpjLookupData } from '../services/cnpjService';
import { UserProfile, UserRole } from '../types';
import {
  validateEmail,
  formatCPF,
  isValidCPF,
  formatCNPJ,
  isValidCNPJ,
  formatPhone,
  stripUndefined,
  REGIONAL_CITIES,
} from '../utils/matchAlgorithm';
import {
  formatCEP,
  isValidCEP,
  normalizeCEP,
  normalizeCPF,
  normalizeCNPJ,
  validatePasswordStrength,
  validateRegistrationInput,
} from '../utils/validation';
import { INITIAL_WELCOME_CREDITS } from '../utils/creditsData';
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Building2,
  ShieldCheck,
  Gift,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialType?: UserRole;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialType = 'candidate',
  initialMode = 'login',
  onClose,
  onSuccess,
  showToast,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'google_onboarding'>(
    initialMode
  );
  const [role, setRole] = useState<'candidate' | 'company'>(
    initialType === 'company' ? 'company' : 'candidate'
  );
  const [registerStyle, setRegisterStyle] = useState<'email_only' | 'full'>('email_only');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    phoneNumber: string;
  } | null>(null);

  const [name, setName] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpjData, setCnpjData] = useState<CnpjLookupData | null>(null);

  const [documentInput, setDocumentInput] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [documentChecking, setDocumentChecking] = useState(false);
  const [documentAvailable, setDocumentAvailable] = useState<boolean | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Campos de Endereço e Consulta Automática de CEP
  const [cep, setCep] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepStatusMsg, setCepStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [street, setStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Presidente Prudente, SP');
  const [stateUf, setStateUf] = useState('SP');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRole(initialType === 'company' ? 'company' : 'candidate');
      setMode(initialMode);
      setPendingGoogleUser(null);
      setDocumentError('');
      setDocumentAvailable(null);
      setCnpjData(null);
      setFieldErrors({});
      setErrorMsg('');
    }
  }, [isOpen, initialType, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectRoleTab = (targetRole: 'candidate' | 'company') => {
    setRole(targetRole);
    setDocumentInput('');
    setDocumentError('');
    setDocumentAvailable(null);
    setCnpjData(null);
    setRazaoSocial('');
    setNomeFantasia('');
    setFieldErrors({});
    setErrorMsg('');
  };

  const handleDocumentChange = async (rawVal: string) => {
    setDocumentError('');
    setDocumentAvailable(null);
    setCnpjData(null);
    setFieldErrors((prev) => ({ ...prev, document: '' }));
    setErrorMsg('');
    const digits = rawVal.replace(/\D/g, '').slice(0, 14);

    // Detecção automática inteligente: até 11 dígitos = CPF (Candidato), 12 a 14 dígitos = CNPJ (Empresa)
    const detectedRole: 'candidate' | 'company' =
      digits.length > 11 ? 'company' : digits.length === 11 ? 'candidate' : role;
    if (digits.length === 11 && role !== 'candidate') {
      setRole('candidate');
    } else if (digits.length > 11 && role !== 'company') {
      setRole('company');
    }

    if (detectedRole === 'candidate' && digits.length <= 11) {
      const formatted = formatCPF(digits);
      setDocumentInput(formatted);
      if (digits.length === 11) {
        if (!isValidCPF(digits)) {
          setDocumentError('CPF inválido. Verifique os 11 números e os dígitos verificadores.');
          return;
        }
        setDocumentChecking(true);
        const check = await checkDocumentAvailability('CPF', digits, pendingGoogleUser?.uid);
        setDocumentChecking(false);
        if (!check.available) {
          setDocumentError(check.message || 'Este CPF já está cadastrado na plataforma.');
          setDocumentAvailable(false);
        } else {
          setDocumentAvailable(true);
        }
      }
    } else {
      const formatted = formatCNPJ(digits);
      setDocumentInput(formatted);
      if (digits.length === 14) {
        if (!isValidCNPJ(digits)) {
          setDocumentError('CNPJ inválido. Verifique os 14 números e os dígitos verificadores.');
          return;
        }
        setDocumentChecking(true);
        const [check, rfLookup] = await Promise.all([
          checkDocumentAvailability('CNPJ', digits, pendingGoogleUser?.uid),
          lookupCompanyByCnpj(digits),
        ]);
        setDocumentChecking(false);

        if (!check.available) {
          setDocumentError(check.message || 'Este CNPJ já está cadastrado na plataforma.');
          setDocumentAvailable(false);
          return;
        }

        if (!rfLookup.success || !rfLookup.data) {
          setDocumentError(
            rfLookup.error ||
              'Este CNPJ encontra-se em situação cadastral inapta ou baixada na Receita Federal e não pode publicar vagas.'
          );
          setDocumentAvailable(false);
          return;
        }

        // Receita Federal confirmou empresa ATIVA: preenche automaticamente Razão Social, Nome Fantasia e Município/UF
        const companyInfo = rfLookup.data;
        setCnpjData(companyInfo);
        setRazaoSocial(companyInfo.razaoSocial);
        setNomeFantasia(companyInfo.nomeFantasia);
        setName(companyInfo.nomeFantasia || companyInfo.razaoSocial);

        if (companyInfo.cep) {
          setCep(formatCEP(companyInfo.cep));
        }
        if (companyInfo.logradouro) {
          setStreet(companyInfo.logradouro);
        }
        if (companyInfo.numero) {
          setAddressNumber(companyInfo.numero);
        }
        if (companyInfo.bairro) {
          setNeighborhood(companyInfo.bairro);
        }
        if (companyInfo.uf) {
          setStateUf(companyInfo.uf);
        }
        if (companyInfo.cityState) {
          setCity(companyInfo.cityState);
        }

        setDocumentAvailable(true);
      }
    }
  };

  const handleCepChange = async (rawVal: string) => {
    const formatted = formatCEP(rawVal);
    setCep(formatted);
    setCepStatusMsg(null);
    setFieldErrors((prev) => ({ ...prev, cep: '' }));

    const digits = normalizeCEP(formatted);
    if (digits.length === 8) {
      if (!isValidCEP(digits)) {
        setCepStatusMsg({
          type: 'error',
          text: 'CEP inválido. Informe 8 dígitos numéricos válidos.',
        });
        return;
      }

      setCepLoading(true);
      const result = await lookupAddressByCep(digits);
      setCepLoading(false);

      if (result.success && result.data) {
        if (result.data.street) setStreet(result.data.street);
        if (result.data.neighborhood) setNeighborhood(result.data.neighborhood);
        if (result.data.state) setStateUf(result.data.state);
        if (result.data.city) {
          const formattedCity = `${result.data.city}, ${result.data.state || 'SP'}`;
          setCity(formattedCity);
        }
        setCepStatusMsg({
          type: 'success',
          text: `Endereço localizado: ${result.data.city}/${result.data.state}. Você pode complementar ou editar abaixo.`,
        });
      } else {
        setCepStatusMsg({
          type: 'error',
          text:
            result.error ||
            'CEP não encontrado. Preencha os campos de endereço manualmente.',
        });
      }
    }
  };

  const getTranslatedFirebaseError = (code: string, rawMessage?: string) => {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado na plataforma. Clique em "Já tenho conta" para entrar.';
      case 'auth/weak-password':
        return rawMessage && !rawMessage.startsWith('Firebase:')
          ? rawMessage
          : 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'Informe um endereço de e-mail válido.';
      case 'auth/popup-closed-by-user':
        return 'A janela de login foi fechada antes de concluir.';
      case 'auth/popup-blocked':
        return 'O navegador bloqueou a janela do Google. Permita pop-ups ou entre usando seu E-mail e Senha.';
      case 'auth/unauthorized-domain':
        return 'Confirme na janela segura do Google ou utilize seu E-mail e Senha abaixo.';
      case 'auth/operation-not-allowed':
        return 'Use seu E-mail e Senha ou a opção "Continuar com o Google".';
      case 'auth/too-many-requests':
        return rawMessage || 'Muitas tentativas seguidas. Aguarde alguns minutos por segurança.';
      default:
        if (rawMessage && !rawMessage.startsWith('Firebase:')) {
          return rawMessage;
        }
        return 'E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.';
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDocumentError('');
    setFieldErrors({});

    if (mode === 'forgot') {
      if (!validateEmail(email)) {
        setErrorMsg('Informe um endereço de e-mail válido.');
        return;
      }
      try {
        setLoading(true);
        await smartResetPassword({
          email: email.trim(),
          document: documentInput.trim() || undefined,
          newPassword: password.trim() || undefined,
        }).catch(() => {});
        showToast(
          'Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha em instantes.'
        );
        setPassword('');
        setMode('login');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'register') {
      const hasTypedDocument = documentInput.replace(/\D/g, '').length > 0;
      const useQuickEmailOnly = registerStyle === 'email_only' && !hasTypedDocument;

      // Modo 1: Cadastro Rápido apenas com E-mail e Senha (sem exigir CPF/CNPJ ou CEP)
      if (useQuickEmailOnly) {
        const cleanEmail = email.trim().toLowerCase();
        const errors: Record<string, string> = {};

        if (!validateEmail(cleanEmail)) {
          errors.email = 'Informe um endereço de e-mail válido.';
        }
        const pwdValidation = validatePasswordStrength(password);
        if (!pwdValidation.valid) {
          errors.password = pwdValidation.message || 'A senha deve ter no mínimo 6 caracteres.';
        }

        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          setErrorMsg(errors.email || errors.password || 'Verifique os campos informados.');
          return;
        }

        try {
          setLoading(true);
          const authRes = await smartRegisterWithEmailPassword(cleanEmail, password);
          const uid = authRes.uid;
          const isAdminUser = await checkIsAdmin(uid, cleanEmail);
          const userType: UserRole = isAdminUser ? 'admin' : role;
          const now = new Date().toISOString();

          const emailNameFallback = cleanEmail
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());

          const displayName =
            name.trim() ||
            (role === 'company' ? `Empresa ${emailNameFallback}` : emailNameFallback || 'Candidato');

          const quickProfile: UserProfile = stripUndefined({
            uid,
            email: cleanEmail,
            name: displayName,
            type: userType,
            phone: phone.trim() ? formatPhone(phone) : undefined,
            city: city || 'Presidente Prudente, SP',
            state: stateUf || 'SP',
            skills: [],
            isVerified: true,
            credits: INITIAL_WELCOME_CREDITS,
            ...(role === 'company'
              ? { nomeFantasia: displayName }
              : { profileCompleteness: 45, savedJobIds: [] }),
            createdAt: now,
            updatedAt: now,
          });

          await saveUserProfile(uid, quickProfile);
          showToast(
            role === 'company'
              ? `Conta da empresa criada com sucesso! Você ganhou +${INITIAL_WELCOME_CREDITS} créditos grátis.`
              : `Conta criada com sucesso! Você ganhou +${INITIAL_WELCOME_CREDITS} créditos grátis para usar no site.`
          );
          onSuccess(quickProfile);
          onClose();
        } catch (err: any) {
          setErrorMsg(getTranslatedFirebaseError(err?.code || '', err?.message));
        } finally {
          setLoading(false);
        }
        return;
      }

      // Modo 2: Cadastro Completo com validação de CPF / CNPJ (Receita Federal) e CEP
      const validation = validateRegistrationInput({
        role,
        name,
        email,
        document: documentInput,
        phone,
        cep,
        street,
        addressNumber,
        neighborhood,
        city,
        state: stateUf,
        password,
        requirePassword: true,
      });

      if (!validation.valid) {
        setFieldErrors(validation.errors);
        if (validation.errors.document) {
          setDocumentError(validation.errors.document);
        }
        setErrorMsg(validation.firstError);
        return;
      }

      try {
        setLoading(true);

        // Para empresas, valida obrigatoriamente na Receita Federal se o CNPJ existe e está ATIVO
        let verifiedCompany: CnpjLookupData | null = cnpjData;
        if (role === 'company') {
          const rfRes = await lookupCompanyByCnpj(validation.normalized.normalizedDocument);
          if (!rfRes.success || !rfRes.data) {
            const rfMsg =
              rfRes.error ||
              'CNPJ inválido, inexistente ou inativo na Receita Federal. Não é possível concluir o cadastro.';
            setDocumentError(rfMsg);
            setFieldErrors((prev) => ({ ...prev, document: rfMsg }));
            setErrorMsg(rfMsg);
            setLoading(false);
            return;
          }
          verifiedCompany = rfRes.data;
        }

        // Verifica unicidade do CPF/CNPJ ANTES de criar o usuário
        const availability = await checkDocumentAvailability(
          validation.normalized.documentType,
          validation.normalized.normalizedDocument
        );
        if (!availability.available) {
          const dupMsg =
            availability.message ||
            `Este ${validation.normalized.documentType} já está cadastrado na plataforma.`;
          setDocumentError(dupMsg);
          setFieldErrors((prev) => ({ ...prev, document: dupMsg }));
          setErrorMsg(dupMsg);
          setLoading(false);
          return;
        }

        const authRes = await smartRegisterWithEmailPassword(
          validation.normalized.email,
          password
        );
        const uid = authRes.uid;

        const isAdminUser = await checkIsAdmin(uid, validation.normalized.email);
        const enforcedRole = role;
        const userType: UserRole = isAdminUser ? 'admin' : enforcedRole;
        const now = new Date().toISOString();

        const baseProfile: UserProfile = {
          uid,
          email: validation.normalized.email,
          name:
            enforcedRole === 'company' && verifiedCompany
              ? name.trim() || verifiedCompany.nomeFantasia || verifiedCompany.razaoSocial
              : validation.normalized.name,
          type: userType,
          documentType: validation.normalized.documentType,
          documentNumber: validation.normalized.formattedDocument,
          normalizedDocument: validation.normalized.normalizedDocument,
          ...(validation.normalized.documentType === 'CPF'
            ? { cpf: validation.normalized.formattedDocument }
            : {
                cnpj: validation.normalized.formattedDocument,
                razaoSocial: verifiedCompany?.razaoSocial || razaoSocial || validation.normalized.name,
                nomeFantasia: verifiedCompany?.nomeFantasia || nomeFantasia || validation.normalized.name,
                cnpjSituacao: verifiedCompany?.situacaoCadastral || 'ATIVA',
              }),
          phone: formatPhone(validation.normalized.phone),
          cep: validation.normalized.cep,
          street: validation.normalized.street,
          addressNumber: validation.normalized.addressNumber,
          neighborhood: validation.normalized.neighborhood,
          city:
            verifiedCompany?.cityState ||
            validation.normalized.city ||
            'Presidente Prudente, SP',
          state: verifiedCompany?.uf || validation.normalized.state || 'SP',
          skills: [],
          isVerified: true,
          createdAt: now,
          updatedAt: now,
        };

        if (enforcedRole === 'company') {
          baseProfile.credits = INITIAL_WELCOME_CREDITS;
        } else {
          baseProfile.credits = INITIAL_WELCOME_CREDITS;
          baseProfile.profileCompleteness = 45;
          baseProfile.savedJobIds = [];
        }

        const cleanProfile = stripUndefined(baseProfile);
        await saveUserProfile(uid, cleanProfile);
        showToast(
          enforcedRole === 'company'
            ? `Empresa cadastrada com sucesso! Você ganhou +${INITIAL_WELCOME_CREDITS} créditos grátis de boas-vindas.`
            : `Conta criada com sucesso! Você ganhou +${INITIAL_WELCOME_CREDITS} créditos grátis para usar no site.`
        );
        onSuccess(cleanProfile);
        onClose();
      } catch (err: any) {
        setErrorMsg(getTranslatedFirebaseError(err?.code || '', err?.message));
      } finally {
        setLoading(false);
      }
    } else {
      // Login somente com E-mail e Senha
      const cleanEmail = email.trim().toLowerCase();
      if (!validateEmail(cleanEmail)) {
        setErrorMsg('Informe um endereço de e-mail válido.');
        return;
      }
      if (!password) {
        setErrorMsg('Informe sua senha para entrar.');
        return;
      }

      try {
        setLoading(true);
        const authRes = await smartSignInWithEmailPassword(cleanEmail, password);
        const uid = authRes.uid;

        let profile = await getUserProfile(uid);
        if (!profile) {
          const isAdminUser = await checkIsAdmin(uid, cleanEmail);
          const now = new Date().toISOString();
          const emailPrefix = cleanEmail
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());

          const autoProfile: UserProfile = stripUndefined({
            uid,
            email: cleanEmail,
            name: name.trim() || emailPrefix || 'Usuário',
            type: isAdminUser ? 'admin' : role,
            city: city || 'Presidente Prudente, SP',
            state: stateUf || 'SP',
            skills: [],
            isVerified: true,
            credits: INITIAL_WELCOME_CREDITS,
            ...(role === 'company' ? {} : { profileCompleteness: 45, savedJobIds: [] }),
            createdAt: now,
            updatedAt: now,
          });
          await saveUserProfile(uid, autoProfile);
          profile = autoProfile;
        }

        showToast(`Bem-vindo(a), ${profile.name.split(' ')[0]}!`);
        onSuccess(profile);
        onClose();
      } catch (err: any) {
        setErrorMsg(getTranslatedFirebaseError(err?.code || '', err?.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setDocumentError('');
    setFieldErrors({});

    try {
      setLoading(true);
      // Importante: Chama smartSignInWithGoogle imediatamente sem awaits prévios para preservar o clique do navegador no pop-up
      const user = await smartSignInWithGoogle();

      let profile = await getUserProfile(user.uid);
      if (!profile) {
        const expectedDocType: 'CPF' | 'CNPJ' = role === 'company' ? 'CNPJ' : 'CPF';
        const cleanDoc =
          expectedDocType === 'CPF' ? normalizeCPF(documentInput) : normalizeCNPJ(documentInput);
        const hasValidOptionalDoc =
          cleanDoc &&
          (expectedDocType === 'CPF' ? isValidCPF(cleanDoc) : isValidCNPJ(cleanDoc));

        if (!hasValidOptionalDoc) {
          setPendingGoogleUser({
            uid: user.uid,
            email: user.email || '',
            displayName:
              name.trim() ||
              user.displayName ||
              (user.email ? user.email.split('@')[0] : 'Usuário Google'),
            phoneNumber: user.phoneNumber || '',
          });
          setMode('google_onboarding');
          setLoading(false);
          return;
        }

        let attachDoc = false;
        const availability = await checkDocumentAvailability(
          expectedDocType,
          cleanDoc,
          user.uid
        );
        if (availability.available) {
          attachDoc = true;
        }

        const isAdminUser = await checkIsAdmin(user.uid, user.email);
        const formattedDoc = attachDoc
          ? expectedDocType === 'CPF'
            ? formatCPF(cleanDoc)
            : formatCNPJ(cleanDoc)
          : undefined;
        const now = new Date().toISOString();
        const fallbackName =
          name.trim() ||
          user.displayName ||
          (user.email ? user.email.split('@')[0] : 'Usuário Google');

        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          name: fallbackName,
          type: isAdminUser ? 'admin' : role,
          ...(attachDoc && formattedDoc
            ? {
                documentType: expectedDocType,
                documentNumber: formattedDoc,
                normalizedDocument: cleanDoc,
                welcomeCreditsGranted: true,
                ...(expectedDocType === 'CPF'
                  ? { cpf: formattedDoc }
                  : {
                      cnpj: formattedDoc,
                      razaoSocial: razaoSocial || fallbackName,
                      nomeFantasia: nomeFantasia || fallbackName,
                      cnpjSituacao: 'ATIVA',
                      isVerifiedCompany: true,
                    }),
              }
            : {}),
          phone: phone.trim() ? formatPhone(phone) : user.phoneNumber || '',
          cep: cep ? formatCEP(cep) : '',
          street: street.trim(),
          addressNumber: addressNumber.trim(),
          neighborhood: neighborhood.trim(),
          city: city || 'Presidente Prudente, SP',
          state: stateUf || 'SP',
          skills: [],
          isVerified: true,
          credits: INITIAL_WELCOME_CREDITS,
          ...(role === 'company' ? {} : { profileCompleteness: 45, savedJobIds: [] }),
          createdAt: now,
          updatedAt: now,
        };
        profile = stripUndefined(newProfile);
        await saveUserProfile(user.uid, profile);

        showToast(
          `Conta conectada com o Google! Você ganhou +${INITIAL_WELCOME_CREDITS} créditos grátis de boas-vindas.`
        );
      } else {
        showToast(`Bem-vindo(a) de volta, ${profile.name.split(' ')[0]}!`);
      }

      onSuccess(profile);
      onClose();
    } catch (err: any) {
      setErrorMsg(getTranslatedFirebaseError(err?.code || '', err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGoogleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingGoogleUser) return;
    setErrorMsg('');
    setDocumentError('');

    const rawDigits = documentInput.replace(/\D/g, '');
    const docType: 'CPF' | 'CNPJ' = rawDigits.length > 11 ? 'CNPJ' : 'CPF';
    const targetRole: 'candidate' | 'company' = docType === 'CNPJ' ? 'company' : 'candidate';

    if (docType === 'CPF' && !isValidCPF(rawDigits)) {
      setDocumentError('Informe um CPF válido de 11 dígitos para ativar sua carteira.');
      return;
    }
    if (docType === 'CNPJ' && !isValidCNPJ(rawDigits)) {
      setDocumentError('Informe um CNPJ válido de 14 dígitos para ativar sua conta empresarial.');
      return;
    }

    setLoading(true);
    try {
      let verifiedCnpj = cnpjData;
      if (docType === 'CNPJ') {
        const rfResult = await lookupCompanyByCnpj(rawDigits);
        if (!rfResult.success || !rfResult.data) {
          setDocumentError(
            rfResult.error ||
              'Este CNPJ encontra-se em situação cadastral inapta ou baixada na Receita Federal e não pode publicar vagas.'
          );
          setLoading(false);
          return;
        }
        verifiedCnpj = rfResult.data;
      }

      const availability = await checkDocumentAvailability(
        docType,
        rawDigits,
        pendingGoogleUser.uid
      );
      if (!availability.available) {
        setDocumentError(
          availability.message || `Este ${docType} já está vinculado a outra conta.`
        );
        setLoading(false);
        return;
      }

      const isAdminUser = await checkIsAdmin(pendingGoogleUser.uid, pendingGoogleUser.email);
      const formattedDoc = docType === 'CPF' ? formatCPF(rawDigits) : formatCNPJ(rawDigits);
      const now = new Date().toISOString();
      const displayName =
        name.trim() ||
        verifiedCnpj?.nomeFantasia ||
        verifiedCnpj?.razaoSocial ||
        pendingGoogleUser.displayName;

      const newProfile: UserProfile = stripUndefined({
        uid: pendingGoogleUser.uid,
        email: pendingGoogleUser.email,
        name: displayName,
        type: isAdminUser ? 'admin' : targetRole,
        documentType: docType,
        documentNumber: formattedDoc,
        normalizedDocument: rawDigits,
        welcomeCreditsGranted: true,
        ...(docType === 'CPF'
          ? { cpf: formattedDoc, profileCompleteness: 55, savedJobIds: [] }
          : {
              cnpj: formattedDoc,
              razaoSocial: verifiedCnpj?.razaoSocial || displayName,
              nomeFantasia: verifiedCnpj?.nomeFantasia || displayName,
              cnpjSituacao: 'ATIVA',
              isVerifiedCompany: true,
            }),
        phone: phone.trim() ? formatPhone(phone) : '',
        city: verifiedCnpj?.cityState || city || 'Presidente Prudente, SP',
        state: stateUf || 'SP',
        skills: [],
        isVerified: true,
        credits: INITIAL_WELCOME_CREDITS,
        createdAt: now,
        updatedAt: now,
      });

      await saveUserProfile(pendingGoogleUser.uid, newProfile);
      showToast(
        `Carteira ativada com sucesso! +${INITIAL_WELCOME_CREDITS} créditos grátis liberados.`
      );
      onSuccess(newProfile);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao concluir ativação da conta.');
    } finally {
      setLoading(false);
    }
  };

  const cityOptions = Array.from(
    new Set([city, ...REGIONAL_CITIES].filter(Boolean))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-[#102746]/60"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="modal-surface w-full max-w-[520px] max-h-[92vh] overflow-y-auto relative z-10"
      >
        <div className="p-5 sm:p-7">
          <div className="flex justify-between items-center mb-4">
            <h2 id="auth-modal-title" className="text-[19px] sm:text-[20px] font-bold text-[#172033]">
              {mode === 'google_onboarding'
                ? 'Ativar Carteira e Liberar 30 Créditos'
                : mode === 'forgot'
                ? 'Recuperar senha'
                : mode === 'register'
                ? 'Criar conta no PrudenEmpregos'
                : 'Entrar no PrudenEmpregos'}
            </h2>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar janela de autenticação"
              className="w-[40px] h-[40px] inline-flex items-center justify-center text-[#667085] hover:text-[#172033] rounded-[8px] hover:bg-[#F4F6FA] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {mode === 'google_onboarding' && pendingGoogleUser ? (
            <form onSubmit={handleCompleteGoogleOnboarding} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Gift className="w-4 h-4" />
                </div>
                <div className="text-[12px] sm:text-[13px] leading-snug">
                  <p className="font-bold text-[#1E40AF]">
                    Confirme seu CPF ou CNPJ para ativar sua carteira e liberar seus 30 créditos grátis
                  </p>
                  <p className="text-[#334155] mt-0.5">
                    Olá, <strong>{pendingGoogleUser.displayName}</strong>! Digite seu CPF (11 dígitos para Candidato) ou CNPJ (14 dígitos para Empresa).
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div role="alert" className="text-[#D92D20] bg-[#FEF2F2] border border-[#D92D20]/20 rounded-lg p-3 text-sm font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label htmlFor="google-onboarding-doc" className="form-label mb-0">
                    CPF (Candidato) ou CNPJ (Empresa) *
                  </label>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      role === 'company'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {role === 'company'
                      ? 'Perfil Empresa identificado'
                      : 'Perfil Candidato identificado'}
                  </span>
                </div>
                <input
                  id="google-onboarding-doc"
                  type="text"
                  inputMode="numeric"
                  required
                  value={documentInput}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  className="form-control tabular-nums"
                />
                {documentError && (
                  <p className="text-xs font-medium text-[#D92D20] mt-1">{documentError}</p>
                )}
              </div>

              {role === 'company' && cnpjData && (
                <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <p className="font-bold text-emerald-800">
                    Receita Federal: {cnpjData.razaoSocial} ({cnpjData.situacaoCadastral})
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || documentChecking}
                className="w-full btn-base btn-md btn-primary"
              >
                {loading
                  ? 'Validando e ativando carteira...'
                  : `Ativar Carteira e Liberar +${INITIAL_WELCOME_CREDITS} Créditos`}
              </button>
            </form>
          ) : (
            <>
          {/* Mode Tabs (Login vs Register) */}
          {mode !== 'forgot' && (
            <div className="flex border-b border-[#E2E8F0] mb-4 text-[14px]">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setDocumentError('');
                  setFieldErrors({});
                }}
                className={`flex-1 pb-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'border-[#1D4ED8] text-[#1D4ED8] font-semibold'
                    : 'border-transparent text-[#667085] hover:text-[#172033]'
                }`}
              >
                Já tenho conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg('');
                  setDocumentError('');
                  setFieldErrors({});
                }}
                className={`flex-1 pb-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'border-[#1D4ED8] text-[#1D4ED8] font-semibold'
                    : 'border-transparent text-[#667085] hover:text-[#172033]'
                }`}
              >
                Criar nova conta (+30 cr grátis)
              </button>
            </div>
          )}

          {/* Banner de Bônus de Boas-Vindas no 1º Cadastro */}
          {mode === 'register' && (
            <div className="mb-4 p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] text-white flex items-center justify-center shrink-0 mt-0.5">
                <Gift className="w-4 h-4" />
              </div>
              <div className="text-[12px] sm:text-[13px] leading-snug">
                <p className="font-bold text-[#1E40AF]">
                  Ganhe {INITIAL_WELCOME_CREDITS} créditos gratuitos no seu 1º cadastro
                </p>
                <p className="text-[#334155] mt-0.5">
                  {role === 'candidate'
                    ? 'Use sem nenhum custo para se candidatar a até 3 vagas (10 cr cada) ou gerar seu Currículo em PDF ATS (15 cr) + 1 candidatura.'
                    : 'Use sem nenhum custo para publicar até 3 vagas (10 cr cada) ou publicar 1 vaga + destacá-la no topo do mural (15 cr).'}
                </p>
              </div>
            </div>
          )}

          {/* Account Type Selector (Candidato vs Empresa) */}
          {mode !== 'forgot' && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F4F7FE] rounded-xl border border-[#DBEAFE]">
                <button
                  type="button"
                  onClick={() => handleSelectRoleTab('candidate')}
                  className={`min-h-[40px] px-3 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                    role === 'candidate'
                      ? 'bg-[#1D4ED8] text-white shadow-sm'
                      : 'bg-transparent text-[#475569] hover:text-[#1E40AF]'
                  }`}
                >
                  Candidato (CPF)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRoleTab('company')}
                  className={`min-h-[40px] px-3 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                    role === 'company'
                      ? 'bg-[#1E40AF] text-white shadow-sm'
                      : 'bg-transparent text-[#475569] hover:text-[#1E40AF]'
                  }`}
                >
                  Empresa (CNPJ)
                </button>
              </div>
              <p className="text-[12px] text-[#667085] mt-1.5">
                {mode === 'login'
                  ? 'Entre com seu E-mail e Senha ou com 1 clique pelo Google.'
                  : registerStyle === 'email_only'
                  ? 'Acesso rápido: crie sua conta usando somente E-mail e Senha (ou com o Google).'
                  : role === 'candidate'
                  ? 'Uso interno exclusivo para validação de identidade (CPF protegido por LGPD).'
                  : 'Validação automática na Receita Federal: apenas CNPJs reais e ATIVOS podem anunciar.'}
              </p>
            </div>
          )}

          {/* Seletor de Estilo de Cadastro: Apenas E-mail e Senha vs Cadastro Completo */}
          {mode === 'register' && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <button
                  type="button"
                  data-testid="register-mode-email-only"
                  onClick={() => {
                    setRegisterStyle('email_only');
                    setErrorMsg('');
                    setDocumentError('');
                    setFieldErrors({});
                  }}
                  className={`min-h-[36px] px-2.5 rounded-lg text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    registerStyle === 'email_only'
                      ? 'bg-white text-[#1D4ED8] shadow-xs border border-[#BFDBFE]'
                      : 'text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>Apenas E-mail e Senha</span>
                </button>
                <button
                  type="button"
                  data-testid="register-mode-full"
                  onClick={() => {
                    setRegisterStyle('full');
                    setErrorMsg('');
                    setDocumentError('');
                    setFieldErrors({});
                  }}
                  className={`min-h-[36px] px-2.5 rounded-lg text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    registerStyle === 'full'
                      ? 'bg-white text-[#1D4ED8] shadow-xs border border-[#BFDBFE]'
                      : 'text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Cadastro Completo ({role === 'candidate' ? 'CPF' : 'CNPJ'})</span>
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="mb-4 text-[#D92D20] bg-[#FEF2F2] border border-[#D92D20]/20 rounded-lg p-3 text-sm font-medium flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} noValidate className="space-y-3.5">
            {mode === 'register' && registerStyle === 'email_only' && (
              <div>
                <label htmlFor="auth-name-quick" className="form-label">
                  {role === 'candidate'
                    ? 'Seu Nome (opcional)'
                    : 'Nome da Empresa (opcional)'}
                </label>
                <input
                  id="auth-name-quick"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder={
                    role === 'candidate'
                      ? 'Ex: Mariana Silva (ou deixe em branco)'
                      : 'Ex: Supermercados Estrela (ou deixe em branco)'
                  }
                  className="form-control"
                />
              </div>
            )}

            {mode === 'register' && registerStyle === 'full' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <label htmlFor="auth-document" className="form-label mb-0">
                        {role === 'candidate' ? 'CPF (11 dígitos) *' : 'CNPJ (14 dígitos) *'}
                      </label>
                      {documentInput.replace(/\D/g, '').length > 0 && (
                        <span
                          data-testid="detected-profile-badge"
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            role === 'company'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {role === 'company'
                            ? 'Perfil Empresa identificado'
                            : 'Perfil Candidato identificado'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="auth-document"
                        type="text"
                        inputMode="numeric"
                        required
                        value={documentInput}
                        onChange={(e) => handleDocumentChange(e.target.value)}
                        placeholder={
                          role === 'candidate' ? '000.000.000-00' : '00.000.000/0001-00'
                        }
                        className={`form-control tabular-nums pr-8 ${
                          documentError || fieldErrors.document
                            ? 'border-[#D92D20]'
                            : documentAvailable === true
                            ? 'border-[#16835D]'
                            : ''
                        }`}
                      />
                      {documentChecking && (
                        <Loader2 className="w-4 h-4 text-[#2457D6] animate-spin absolute right-2.5 top-3" />
                      )}
                      {!documentChecking && documentAvailable === true && !documentError && (
                        <CheckCircle2 className="w-4 h-4 text-[#16835D] absolute right-2.5 top-3" />
                      )}
                    </div>
                    {(documentError || fieldErrors.document) && (
                      <p className="text-xs font-medium text-[#D92D20] mt-1">
                        {documentError || fieldErrors.document}
                      </p>
                    )}
                    {!documentError && documentAvailable === true && (
                      <p className="text-[11px] font-medium text-[#16835D] mt-1">
                        {role === 'candidate'
                          ? 'CPF válido e disponível.'
                          : 'CNPJ ATIVO confirmado na Receita Federal.'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="auth-phone" className="form-label">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      id="auth-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => {
                        setPhone(formatPhone(e.target.value));
                        setFieldErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                      placeholder="(18) 99999-9999"
                      className={`form-control tabular-nums ${
                        fieldErrors.phone ? 'border-[#D92D20]' : ''
                      }`}
                    />
                    {fieldErrors.phone && (
                      <p className="text-xs font-medium text-[#D92D20] mt-1">
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card de confirmação Receita Federal quando CNPJ ativo é localizado */}
                {role === 'company' && cnpjData && (
                  <div
                    data-testid="receita-federal-verified-card"
                    className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <Building2 className="w-3.5 h-3.5" />
                        Dados Oficiais da Receita Federal
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-200/80 text-emerald-900">
                        Situação: {cnpjData.situacaoCadastral}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900">
                      Razão Social: <span className="font-normal">{cnpjData.razaoSocial}</span>
                    </p>
                    {cnpjData.nomeFantasia && (
                      <p className="font-semibold text-slate-900">
                        Nome Fantasia: <span className="font-normal">{cnpjData.nomeFantasia}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-emerald-800">
                      Município/UF: {cnpjData.cityState}
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="auth-name" className="form-label">
                    {role === 'candidate'
                      ? 'Nome completo *'
                      : 'Nome Fantasia / Nome de Exibição da Empresa *'}
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder={
                      role === 'candidate'
                        ? 'Ex: Mariana Silva Santos'
                        : 'Preenchido automaticamente pelo CNPJ ou informe o Nome Fantasia'
                    }
                    className={`form-control ${
                      fieldErrors.name ? 'border-[#D92D20] focus:border-[#D92D20]' : ''
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-xs font-medium text-[#D92D20] mt-1">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Bloco de Endereço com Consulta Automática por CEP */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#1E293B] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#2457D6]" />
                      <span>Endereço Interno (Protegido por LGPD)</span>
                    </span>
                    {cepLoading && (
                      <span className="text-[11px] font-semibold text-[#2457D6] flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Consultando CEP...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label htmlFor="auth-cep" className="text-[12px] font-semibold text-[#334155] block mb-1">
                        CEP *
                      </label>
                      <input
                        id="auth-cep"
                        type="text"
                        inputMode="numeric"
                        required
                        value={cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="19010-000"
                        className={`form-control text-sm tabular-nums ${
                          fieldErrors.cep ? 'border-[#D92D20]' : ''
                        }`}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="auth-city" className="text-[12px] font-semibold text-[#334155] block mb-1">
                        Cidade / UF *
                      </label>
                      <select
                        id="auth-city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="form-control text-sm cursor-pointer"
                      >
                        {cityOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {fieldErrors.cep && (
                    <p className="text-xs font-medium text-[#D92D20]">{fieldErrors.cep}</p>
                  )}

                  {cepStatusMsg && (
                    <p
                      className={`text-[11px] font-medium ${
                        cepStatusMsg.type === 'success' ? 'text-[#16835D]' : 'text-[#B45309]'
                      }`}
                    >
                      {cepStatusMsg.text}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label htmlFor="auth-street" className="text-[12px] font-medium text-[#475569] block mb-1">
                        Logradouro / Rua
                      </label>
                      <input
                        id="auth-street"
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Rua ou Avenida"
                        className="form-control text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="auth-number" className="text-[12px] font-medium text-[#475569] block mb-1">
                        Número
                      </label>
                      <input
                        id="auth-number"
                        type="text"
                        value={addressNumber}
                        onChange={(e) => setAddressNumber(e.target.value)}
                        placeholder="Ex: 120"
                        className="form-control text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-neighborhood" className="text-[12px] font-medium text-[#475569] block mb-1">
                      Bairro
                    </label>
                    <input
                      id="auth-neighborhood"
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Ex: Centro"
                      className="form-control text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="form-label">
                {mode === 'register' && role === 'company' ? 'E-mail corporativo *' : 'E-mail *'}
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder={
                  role === 'company' ? 'rh@suaempresa.com.br' : 'seu@email.com.br'
                }
                className={`form-control ${fieldErrors.email ? 'border-[#D92D20]' : ''}`}
              />
              {fieldErrors.email && (
                <p className="text-xs font-medium text-[#D92D20] mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {mode === 'forgot' && (
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <p className="text-[12px] text-[#475569] leading-relaxed">
                  Para redefinir sua senha imediatamente com segurança, informe sua nova senha abaixo (e o{' '}
                  <strong>CPF ou CNPJ</strong> caso tenha vinculado ao perfil):
                </p>
                <div>
                  <label htmlFor="auth-forgot-doc" className="text-[12px] font-semibold text-[#334155] block mb-1">
                    CPF ou CNPJ do Titular (se vinculado)
                  </label>
                  <input
                    id="auth-forgot-doc"
                    type="text"
                    inputMode="numeric"
                    value={documentInput}
                    onChange={(e) => handleDocumentChange(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    className="form-control text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="auth-forgot-new-password" className="text-[12px] font-semibold text-[#334155] block mb-1">
                    Nova Senha (mín. 6 caracteres)
                  </label>
                  <input
                    id="auth-forgot-new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className="form-control text-sm"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="auth-password" className="text-[14px] font-medium text-[#172033]">
                    Senha *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMsg('');
                      }}
                      className="text-[12px] font-medium text-[#2457D6] hover:underline cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    placeholder="Mínimo de 6 caracteres"
                    className={`form-control pr-10 ${fieldErrors.password ? 'border-[#D92D20]' : ''}`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B] p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs font-medium text-[#D92D20] mt-1">
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || documentChecking}
              className="w-full btn-base btn-md btn-primary"
            >
              {loading
                ? 'Processando com segurança...'
                : mode === 'forgot'
                ? password.trim()
                  ? 'Redefinir Senha Agora'
                  : 'Enviar link de recuperação'
                : mode === 'register'
                ? registerStyle === 'email_only'
                  ? `Criar Conta com E-mail e Senha (+${INITIAL_WELCOME_CREDITS} Créditos)`
                  : role === 'company'
                  ? `Cadastrar Empresa e Ganhar +${INITIAL_WELCOME_CREDITS} Créditos`
                  : `Criar Conta e Ganhar +${INITIAL_WELCOME_CREDITS} Créditos Grátis`
                : 'Entrar com E-mail e Senha'}
            </button>

            {mode === 'register' && (
              <p className="text-[11px] text-[#667085] text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  {registerStyle === 'email_only'
                    ? 'Cadastro instantâneo: você pode complementar seu perfil depois no painel.'
                    : 'Seus documentos e endereço são de uso estritamente interno e protegidos por LGPD.'}
                </span>
              </p>
            )}
          </form>

          {mode !== 'forgot' && (
            <div className="mt-4">
              <div className="relative flex py-2 items-center">
                <div className="grow border-t border-[#E2E8F0]" />
                <span className="shrink mx-3 text-[12px] text-[#667085]">ou acesso com 1 clique</span>
                <div className="grow border-t border-[#E2E8F0]" />
              </div>

              <button
                type="button"
                data-testid="google-signin-button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full btn-base btn-md btn-secondary mt-1"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continuar com o Google
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full mt-3 btn-base btn-sm btn-ghost"
            >
              Voltar para o login
            </button>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
