'use client';

import { useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Fingerprint, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  Smartphone,
  Laptop,
  Shield
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

interface WebAuthnScannerProps {
  isOpen: boolean;
  personId: string;
  personName: string;
  onVerified: (verified: boolean) => void;
  onCancel: () => void;
}

export function WebAuthnScanner({ 
  isOpen, 
  personId, 
  personName, 
  onVerified, 
  onCancel 
}: WebAuthnScannerProps) {
  const { token } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [status, setStatus] = useState<'idle' | 'checking' | 'registering' | 'authenticating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Check if user has registered credentials
  useEffect(() => {
    if (isOpen) {
      checkCredentials();
    }
  }, [isOpen]);

  const checkCredentials = async () => {
    setStatus('checking');
    setMessage('Checking biometric registration...');
    
    try {
      const res = await fetch('/api/webauthn/authenticate/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 400) {
        const data = await res.json();
        if (data.error === 'NO_CREDENTIALS') {
          setNeedsRegistration(true);
          setStatus('idle');
          setMessage('No biometric registered. Please register your device.');
          return;
        }
      }

      if (!res.ok) {
        throw new Error('Failed to check credentials');
      }

      // Has credentials - proceed to authenticate
      setNeedsRegistration(false);
      setStatus('idle');
      setMessage('Biometric registered. Ready to verify.');
    } catch (error: any) {
      setNeedsRegistration(true);
      setStatus('idle');
      setMessage('No biometric found. Register your device.');
      console.error('Check credentials error:', error);
    }
  };

  const handleRegister = async () => {
    setStatus('registering');
    setMessage('Registering your biometric...');
    
    try {
      // 1. Get registration options
      const optsRes = await fetch('/api/webauthn/register/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!optsRes.ok) {
        throw new Error('Failed to get registration options');
      }

      const opts = await optsRes.json();

      // 2. Call browser WebAuthn API
      const attestation = await startRegistration(opts);

      // 3. Send to server
      const finishRes = await fetch('/api/webauthn/register/finish', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(attestation)
      });

      const result = await finishRes.json();

      if (result.verified) {
        setNeedsRegistration(false);
        addToast({
          title: 'Biometric Registered',
          message: 'Your device is now registered for biometric verification.',
          variant: 'success'
        });
        // Proceed to authenticate
        await handleAuthenticate();
      } else {
        throw new Error('Registration failed');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Registration failed. Please try again.');
      addToast({
        title: 'Registration Failed',
        message: error.message || 'Could not register biometric.',
        variant: 'error'
      });
    }
  };

  const handleAuthenticate = async () => {
    setStatus('authenticating');
    setMessage(`Please verify your identity for ${personName}`);
    setAttempts(prev => prev + 1);

    try {
      // 1. Get authentication options
      const optsRes = await fetch('/api/webauthn/authenticate/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!optsRes.ok) {
        const errorData = await optsRes.json();
        if (errorData.error === 'NO_CREDENTIALS') {
          setNeedsRegistration(true);
          setStatus('idle');
          setMessage('No biometric registered. Please register your device.');
          return;
        }
        throw new Error(errorData.error || 'Failed to start authentication');
      }

      const opts = await optsRes.json();

      // 2. Call browser WebAuthn API
      const assertion = await startAuthentication(opts);

      // 3. Send to server
      const finishRes = await fetch('/api/webauthn/authenticate/finish', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assertion)
      });

      const result = await finishRes.json();

      if (result.verified) {
        setStatus('success');
        setMessage('✅ Biometric Verified!');
        onVerified(true);
        addToast({
          title: 'Biometric Verified',
          message: `Identity confirmed for ${personName}`,
          variant: 'success'
        });
        setTimeout(() => onCancel(), 1500);
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      if (attempts >= 3) {
        setStatus('error');
        setMessage('Max attempts exceeded. Access denied.');
        addToast({
          title: 'Access Denied',
          message: 'Too many failed biometric attempts.',
          variant: 'error'
        });
        onVerified(false);
        setTimeout(() => onCancel(), 2000);
      } else {
        setStatus('error');
        setMessage(`Verification failed. Attempt ${attempts} of 3. Please try again.`);
        // Allow retry after a moment
        setTimeout(() => {
          setStatus('idle');
          setMessage('Ready to try again.');
        }, 1500);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-8 max-w-md w-full shadow-2xl"
        >
          <div className="text-center space-y-6">
            {/* Status Icon */}
            <div className="relative">
              <div className={`
                w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all duration-300
                ${status === 'success' ? 'bg-emerald-500/20 ring-2 ring-emerald-500/40' :
                  status === 'error' ? 'bg-red-500/20 ring-2 ring-red-500/40' :
                  status === 'authenticating' ? 'bg-blue-500/20 ring-2 ring-blue-500/40 animate-pulse' :
                  status === 'registering' ? 'bg-amber-500/20 ring-2 ring-amber-500/40' :
                  'bg-slate-500/10 ring-2 ring-slate-500/20'}
              `}>
                {status === 'authenticating' && <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />}
                {status === 'registering' && <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />}
                {status === 'success' && <CheckCircle className="w-12 h-12 text-emerald-400" />}
                {status === 'error' && <XCircle className="w-12 h-12 text-red-400" />}
                {status === 'idle' && <Fingerprint className="w-12 h-12 text-[var(--text-secondary)]" />}
                {status === 'checking' && <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />}
              </div>
            </div>

            {/* Title & Message */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                {needsRegistration ? 'Register Biometric' :
                 status === 'authenticating' ? 'Verifying Identity' :
                 status === 'success' ? 'Verified!' :
                 status === 'error' ? 'Verification Failed' :
                 'Biometric Verification'}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {message}
              </p>
            </div>

            {/* Device Info */}
            {status === 'idle' && !needsRegistration && (
              <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-1">
                  <Smartphone className="w-4 h-4" />
                  <span>Touch ID / Face ID</span>
                </div>
                <div className="flex items-center gap-1">
                  <Laptop className="w-4 h-4" />
                  <span>Windows Hello</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-[var(--border)]">
              {needsRegistration && (
                <button
                  onClick={handleRegister}
                  disabled={status === 'registering'}
                  className="w-full py-3 rounded-xl bg-[var(--action-primary)] text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {status === 'registering' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      Register Biometric
                    </>
                  )}
                </button>
              )}

              {!needsRegistration && status === 'idle' && (
                <button
                  onClick={handleAuthenticate}
                  className="w-full py-3 rounded-xl bg-[var(--action-primary)] text-white font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Verify Biometric
                </button>
              )}

              {status === 'error' && attempts < 3 && (
                <button
                  onClick={() => {
                    setStatus('idle');
                    setMessage('Ready to try again.');
                  }}
                  className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold hover:opacity-90 transition-all"
                >
                  Try Again
                </button>
              )}

              <button
                onClick={onCancel}
                className="w-full py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Security Note */}
            <p className="text-[10px] text-[var(--text-muted)] flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Biometric data never leaves your device
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}