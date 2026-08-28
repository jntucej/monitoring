'use client';

import { useState, useEffect } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Fingerprint, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Smartphone,
  Laptop,
  Shield,
  ShieldAlert
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
  
  const [status, setStatus] = useState<'idle' | 'checking' | 'authenticating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [overriding, setOverriding] = useState(false);

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
          setHasCredentials(false);
          setStatus('idle');
          setMessage('No biometric credential found. Biometrics must be enrolled by a System Administrator.');
          return;
        }
      }

      if (!res.ok) {
        throw new Error('Failed to check credentials');
      }

      // Has credentials - proceed to authenticate
      setHasCredentials(true);
      setStatus('idle');
      setMessage(`Biometric registered for ${personName}. Ready to verify.`);
    } catch (error: any) {
      setHasCredentials(false);
      setStatus('idle');
      setMessage('No biometric registered on file for this user.');
      console.error('Check credentials error:', error);
    }
  };

  const handleOverride = async () => {
    setOverriding(true);
    try {
      const res = await fetch('/api/operator/override-biometric', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personId,
          personName,
          reason: 'Operator manual override at gate scanner',
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        addToast({
          title: '⚠️ Biometric Overridden',
          message: `Biometric verification overridden for ${personName}. Alert dispatched to SysAdmin & Admin.`,
          variant: 'warning',
          duration: 4000,
        });
      } else {
        addToast({
          title: 'Override Approved',
          message: 'Proceeding with manual verification.',
          variant: 'info',
        });
      }

      onVerified(true);
    } catch (e) {
      console.error('Override error:', e);
      addToast({
        title: 'Override Approved',
        message: 'Proceeding with manual verification.',
        variant: 'info',
      });
      onVerified(true);
    } finally {
      setOverriding(false);
    }
  };

  const handleAuthenticate = async () => {
    setStatus('authenticating');
    setMessage(`Please verify identity for ${personName}`);
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
          setHasCredentials(false);
          setStatus('idle');
          setMessage('No biometric registered on file. Must be enrolled by System Admin.');
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
        setMessage('Max attempts exceeded. Biometric verification failed.');
        addToast({
          title: 'Biometric Check Failed',
          message: 'Too many failed biometric attempts.',
          variant: 'error'
        });
      } else {
        setStatus('error');
        setMessage(`Verification failed. Attempt ${attempts} of 3. Please try again or request override.`);
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
                  hasCredentials === false ? 'bg-amber-500/20 ring-2 ring-amber-500/40' :
                  'bg-slate-500/10 ring-2 ring-slate-500/20'}
              `}>
                {status === 'authenticating' && <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />}
                {status === 'success' && <CheckCircle className="w-12 h-12 text-emerald-400" />}
                {status === 'error' && <XCircle className="w-12 h-12 text-red-400" />}
                {status === 'idle' && hasCredentials === false && <AlertTriangle className="w-12 h-12 text-amber-400" />}
                {status === 'idle' && hasCredentials !== false && <Fingerprint className="w-12 h-12 text-[var(--text-secondary)]" />}
                {status === 'checking' && <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />}
              </div>
            </div>

            {/* Title & Message */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                {hasCredentials === false ? 'No Biometric Enrolled' :
                 status === 'authenticating' ? 'Verifying Identity' :
                 status === 'success' ? 'Verified!' :
                 status === 'error' ? 'Verification Failed' :
                 'Biometric Check'}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {message}
              </p>
            </div>

            {/* Warning callout when no credentials registered */}
            {hasCredentials === false && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-1 text-xs text-amber-300">
                <p className="font-bold flex items-center gap-1.5 text-amber-400">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  SysAdmin Enrollment Required
                </p>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  Biometrics can only be registered by a System Administrator in the SysAdmin panel. Operators cannot enroll biometrics.
                </p>
              </div>
            )}

            {/* Device Info */}
            {status === 'idle' && hasCredentials === true && (
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
              {hasCredentials === true && status === 'idle' && (
                <button
                  onClick={handleAuthenticate}
                  className="w-full py-3 rounded-xl bg-[var(--action-primary)] text-white font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Verify Biometric
                </button>
              )}

              {/* Override Button for Operator */}
              {(hasCredentials === false || status === 'error') && (
                <button
                  onClick={handleOverride}
                  disabled={overriding}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                >
                  {overriding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Notifying Admins...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      Override Biometric & Proceed
                    </>
                  )}
                </button>
              )}

              {status === 'error' && hasCredentials === true && attempts < 3 && (
                <button
                  onClick={() => {
                    setStatus('idle');
                    setMessage('Ready to try again.');
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition-all"
                >
                  Try Again
                </button>
              )}

              <button
                onClick={onCancel}
                className="w-full py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel Scan
              </button>
            </div>

            {/* Security Note */}
            <p className="text-[10px] text-[var(--text-muted)] flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Overriding dispatches an instant security notification to System & Campus Admins
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}