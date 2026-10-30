import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { validatePasswordStrength } from '../utils/validation';

const LOGIN_RATE_LIMIT_KEY = 'pruden_login_attempts_v1';
const PBKDF2_ITERATIONS = 100000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000;

type SessionListener = (uid: string | null) => void;
const sessionListeners = new Set<SessionListener>();
const inMemoryRateLimit = new Map<string, { attempts: number; lockedUntil: number }>();

/**
 * Retorna exclusivamente o UID autenticado pelo SDK oficial do Firebase Authentication.
 * Nenhuma sessão paralela em localStorage (usr_...) é aceita (AUD-01 / AUD-06).
 */
export function getActiveSessionUid(): string | null {
  return auth.currentUser?.uid || null;
}

export function setActiveSessionUid(uid: string | null): void {
  sessionListeners.forEach((listener) => {
    try {
      listener(uid);
    } catch {
      // ignore listener error
    }
  });
}

export function subscribeCloudSession(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

/**
 * Comparação em tempo constante para mitigar ataques de timing.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function getAttemptRecord(emailKey: string): { attempts: number; lockedUntil: number } {
  const mem = inMemoryRateLimit.get(emailKey);
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`${LOGIN_RATE_LIMIT_KEY}_${emailKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.attempts === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return mem || { attempts: 0, lockedUntil: 0 };
}

function saveAttemptRecord(emailKey: string, record: { attempts: number; lockedUntil: number }): void {
  inMemoryRateLimit.set(emailKey, record);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${LOGIN_RATE_LIMIT_KEY}_${emailKey}`, JSON.stringify(record));
    } catch {
      // ignore
    }
  }
}

export function checkLoginRateLimit(email: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  const key = email.trim().toLowerCase();
  const record = getAttemptRecord(key);
  const now = Date.now();

  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  if (record.lockedUntil && record.lockedUntil <= now) {
    saveAttemptRecord(key, { attempts: 0, lockedUntil: 0 });
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS, retryAfterSeconds: 0 };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - record.attempts),
    retryAfterSeconds: 0,
  };
}

export function recordFailedLoginAttempt(email: string): {
  locked: boolean;
  retryAfterSeconds: number;
} {
  const key = email.trim().toLowerCase();
  const current = getAttemptRecord(key);
  const attempts = current.attempts + 1;
  const locked = attempts >= MAX_LOGIN_ATTEMPTS;
  const lockedUntil = locked ? Date.now() + LOCKOUT_WINDOW_MS : 0;
  saveAttemptRecord(key, { attempts, lockedUntil });
  return {
    locked,
    retryAfterSeconds: locked ? Math.ceil(LOCKOUT_WINDOW_MS / 1000) : 0,
  };
}

export function resetLoginAttempts(email: string): void {
  const key = email.trim().toLowerCase();
  inMemoryRateLimit.delete(key);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(`${LOGIN_RATE_LIMIT_KEY}_${key}`);
    } catch {
      // ignore
    }
  }
}

function fallbackDeterministicHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

export async function sha256Hex(message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback below
    }
  }
  return (
    fallbackDeterministicHash(message) +
    fallbackDeterministicHash('salt_' + message)
  ).slice(0, 48);
}

export async function derivePbkdf2Hash(
  email: string,
  password: string,
  customSaltHex?: string
): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  const saltHex =
    customSaltHex || (await sha256Hex(`pruden_pbkdf2_salt_v2::${cleanEmail}`)).slice(0, 24);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const baseKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: enc.encode(`pruden_v2_${saltHex}_${cleanEmail}`),
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        baseKey,
        256
      );
      const derivedHex = Array.from(new Uint8Array(derivedBits))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 48);
      return `pbkdf2$${saltHex}$${derivedHex}`;
    } catch {
      // fallback below
    }
  }

  const fallbackHex = (await sha256Hex(`pbkdf2_fb_${saltHex}_${cleanEmail}::${password}`)).slice(
    0,
    48
  );
  return `pbkdf2$${saltHex}$${fallbackHex}`;
}

export async function hashAccountPassword(email: string, password: string): Promise<string> {
  return derivePbkdf2Hash(email, password);
}

export async function verifyAccountPassword(
  email: string,
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsUpgrade: boolean; upgradedHash?: string }> {
  if (!storedHash) return { valid: false, needsUpgrade: false };

  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    const saltHex = parts[1] || '';
    const candidateHash = await derivePbkdf2Hash(email, password, saltHex);
    return {
      valid: constantTimeEqual(candidateHash, storedHash),
      needsUpgrade: false,
    };
  }

  const clean = email.trim().toLowerCase();
  const legacyV1 = await sha256Hex(`pruden_pw_v1_${clean}::${password}`);
  const isLegacyMatch = constantTimeEqual(legacyV1, storedHash);
  if (isLegacyMatch) {
    const upgradedHash = await derivePbkdf2Hash(clean, password);
    return { valid: true, needsUpgrade: true, upgradedHash };
  }

  return { valid: false, needsUpgrade: false };
}

/**
 * Cadastro oficial via Firebase Authentication (createUserWithEmailAndPassword).
 */
export async function smartRegisterWithEmailPassword(
  email: string,
  password: string
): Promise<{ uid: string; email: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const pwdCheck = validatePasswordStrength(password);
  if (!pwdCheck.valid) {
    const weakErr: any = new Error(pwdCheck.message || 'Senha fraca.');
    weakErr.code = 'auth/weak-password';
    throw weakErr;
  }

  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  return {
    uid: cred.user.uid,
    email: cred.user.email || cleanEmail,
  };
}

/**
 * Login oficial via Firebase Authentication (signInWithEmailAndPassword) com proteção anti-força bruta.
 */
export async function smartSignInWithEmailPassword(
  email: string,
  password: string
): Promise<{ uid: string; email: string }> {
  const cleanEmail = email.trim().toLowerCase();

  const rateCheck = checkLoginRateLimit(cleanEmail);
  if (!rateCheck.allowed) {
    const lockErr: any = new Error(
      `Muitas tentativas incorretas. Por segurança, aguarde ${rateCheck.retryAfterSeconds} segundos antes de tentar novamente.`
    );
    lockErr.code = 'auth/too-many-requests';
    throw lockErr;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    resetLoginAttempts(cleanEmail);
    return {
      uid: cred.user.uid,
      email: cred.user.email || cleanEmail,
    };
  } catch (err: any) {
    const failInfo = recordFailedLoginAttempt(cleanEmail);
    if (failInfo.locked) {
      const lockErr: any = new Error(
        `Conta temporariamente bloqueada após 5 tentativas falhas. Tente novamente em ${failInfo.retryAfterSeconds}s.`
      );
      lockErr.code = 'auth/too-many-requests';
      throw lockErr;
    }
    throw err;
  }
}

/**
 * Recuperação oficial de senha via Firebase Authentication sem enumeração de contas (AUD-08).
 */
export async function smartResetPassword(options: {
  email: string;
  document?: string;
  newPassword?: string;
}): Promise<{ mode: 'email_sent' | 'password_updated'; message: string }> {
  const cleanEmail = options.email.trim().toLowerCase();
  await sendPasswordResetEmail(auth, cleanEmail).catch(() => {});
  return {
    mode: 'email_sent',
    message:
      'Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha em instantes.',
  };
}

export interface SmartGoogleAuthResult {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
}

/**
 * Login oficial com Google via Firebase Authentication (signInWithPopup).
 */
export async function smartSignInWithGoogle(): Promise<SmartGoogleAuthResult> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const res = await signInWithPopup(auth, provider);
  return {
    uid: res.user.uid,
    email: res.user.email,
    displayName: res.user.displayName,
    phoneNumber: res.user.phoneNumber,
    photoURL: res.user.photoURL,
  };
}
