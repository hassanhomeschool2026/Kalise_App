import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Database,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Code,
} from 'lucide-react';
import {
  authService,
  supabase,
  isSupabaseConfigured,
  isPasswordRecoveryUrl,
  KALISE_SCHEMA_SQL,
} from '../services/supabase';

interface Props {
  onAuthSuccess: () => void;
  onContinueOfflinePreview?: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

export const AuthView: React.FC<Props> = ({
  onAuthSuccess,
  onContinueOfflinePreview,
}) => {
  const [mode, setMode] = useState<AuthMode>(() =>
    isPasswordRecoveryUrl() ? 'reset' : 'login'
  );

  // Form inputs
  const [preferredName, setPreferredName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);

  // Check URL on mount for password recovery
  useEffect(() => {
    if (isPasswordRecoveryUrl()) {
      setMode('reset');
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        clearMessages();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleCopySchema = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(KALISE_SCHEMA_SQL);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = KALISE_SCHEMA_SQL;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2500);
    } catch (err) {
      console.error('Failed to copy schema:', err);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    // Client-side validations
    if (!email.trim() && mode !== 'reset') {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (mode === 'signup') {
      if (!preferredName.trim()) {
        setErrorMessage('Please enter what Kalise should call you.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password should be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    }

    if (mode === 'reset') {
      if (password.length < 6) {
        setErrorMessage('New password should be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        await authService.signIn(email.trim(), password);
        onAuthSuccess();
      } else if (mode === 'signup') {
        const result = await authService.signUp(
          email.trim(),
          password,
          preferredName.trim()
        );
        if (result.session) {
          // Auto signed in
          onAuthSuccess();
        } else {
          // Email confirmation is required by Supabase project settings
          setSuccessMessage(
            'Account created! A confirmation link has been sent to your email. Please check your inbox to activate your account, then log in.'
          );
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      } else if (mode === 'forgot') {
        await authService.resetPasswordForEmail(email.trim());
        setSuccessMessage(
          'If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.'
        );
      } else if (mode === 'reset') {
        await authService.updatePassword(password);
        setSuccessMessage(
          'Password updated successfully. You can now log in with your new password.'
        );
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        // Clean URL hash
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    } catch (err: unknown) {
      console.error('Auth error:', err);
      const msg = err instanceof Error ? err.message : 'An error occurred during authentication.';
      // Provide empathetic, understandable error messages
      if (msg.includes('Invalid login credentials')) {
        setErrorMessage('Incorrect email or password, or email confirmation is pending. If you just signed up, please check your inbox and click the confirmation link before logging in.');
      } else if (msg.includes('User already registered')) {
        setErrorMessage('An account with this email already exists. Try logging in.');
      } else if (msg.includes('Email not confirmed')) {
        setErrorMessage('Please confirm your email address before logging in.');
      } else if (
        msg.toLowerCase().includes('rate limit') ||
        msg.toLowerCase().includes('over_email_send_rate_limit') ||
        msg.toLowerCase().includes('error sending confirmation email')
      ) {
        setErrorMessage(
          'Verification email could not be sent. Supabase default free-tier SMTP has a strict rate limit (3-4 emails/hour). Please configure a custom SMTP provider (such as Resend or SendGrid) in your Supabase Dashboard under Authentication -> Providers -> SMTP.'
        );
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-center items-center px-4 py-8 font-sans selection:bg-teal-500/20 selection:text-teal-200">
      <div className="w-full max-w-md space-y-6">
        {/* Brand identity header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-teal-500/20 to-indigo-500/30 border border-teal-500/30 flex items-center justify-center shadow-lg shadow-teal-500/10">
            <svg viewBox="0 0 100 100" className="w-7 h-7 text-teal-300 fill-current">
              <circle cx="50" cy="50" r="12" className="opacity-80" />
              <path
                d="M 50,15 C 60,30 65,40 50,50 C 35,40 40,30 50,15 Z"
                className="opacity-70 fill-teal-400"
              />
              <path
                d="M 85,50 C 70,60 60,65 50,50 C 60,35 70,40 85,50 Z"
                className="opacity-70 fill-indigo-400"
              />
              <path
                d="M 50,85 C 40,70 35,60 50,50 C 65,60 60,70 50,85 Z"
                className="opacity-70 fill-teal-400"
              />
              <path
                d="M 15,50 C 30,40 40,35 50,50 C 40,65 30,60 15,50 Z"
                className="opacity-70 fill-indigo-400"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold font-serif tracking-tight text-slate-100">
            Kalise
          </h1>
          <p className="text-xs text-slate-400">
            Adult Emotional Wellness &amp; AI Companion
          </p>
        </div>

        {/* Missing Supabase Configuration Notice (if env vars are not yet populated) */}
        {!isSupabaseConfigured && (
          <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 text-xs text-slate-300 space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <Database className="w-4 h-4" />
              <span>Connect Existing Zencora Supabase Project</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Kalise uses Supabase Auth and Row Level Security from your existing Zencora Supabase
              project. To complete the connection, configure these two variables:
            </p>
            <div className="p-3 rounded-xl bg-slate-800 font-mono text-[11px] text-teal-300 space-y-1">
              <p>VITE_SUPABASE_URL="https://your-project.supabase.co"</p>
              <p>VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-or-publishable-key"</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySchema}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-medium border border-teal-500/20 transition cursor-pointer"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? 'SQL Copied!' : 'Copy SQL Schema for Supabase'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSqlPreview(!showSqlPreview)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                  title="View complete migration SQL"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{showSqlPreview ? 'Hide SQL' : 'View SQL'}</span>
                  {showSqlPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {onContinueOfflinePreview && (
                <button
                  type="button"
                  onClick={onContinueOfflinePreview}
                  className="text-xs text-slate-400 hover:text-slate-200 underline transition cursor-pointer"
                >
                  Local Prototype Mode
                </button>
              )}
            </div>

            {showSqlPreview && (
              <div className="mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                  <span className="text-[11px] font-mono text-slate-400">
                    7 Kalise tables · Multi-App RLS (app_id = 'kalise')
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySchema}
                    className="text-[10px] text-teal-300 hover:text-teal-200 underline"
                  >
                    {copiedSchema ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="max-h-56 overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-300 p-2 bg-slate-900/60 rounded-xl select-all whitespace-pre">
                  {KALISE_SCHEMA_SQL}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Auth Card */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-5">
          {/* Card Title & Mode Toggle */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-base font-semibold text-slate-100 font-serif">
              {mode === 'login' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
              {mode === 'reset' && 'Set New Password'}
            </h2>

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  clearMessages();
                }}
                className="text-xs text-teal-300 hover:text-teal-200 font-medium transition cursor-pointer"
              >
                Need an account?
              </button>
            )}

            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearMessages();
                }}
                className="text-xs text-teal-300 hover:text-teal-200 font-medium transition cursor-pointer"
              >
                Have an account?
              </button>
            )}

            {(mode === 'forgot' || mode === 'reset') && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearMessages();
                }}
                className="text-xs text-teal-300 hover:text-teal-200 font-medium transition cursor-pointer"
              >
                Back to Sign In
              </button>
            )}
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Preferred Name (Signup only) */}
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="block font-semibold text-slate-300">
                  What should Kalise call you?
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    placeholder="e.g. Jordan, Alex, or your nickname"
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60"
                  />
                </div>
              </div>
            )}

            {/* Email (Login, Signup, Forgot) */}
            {mode !== 'reset' && (
              <div className="space-y-1">
                <label className="block font-semibold text-slate-300">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60"
                  />
                </div>
              </div>
            )}

            {/* Password (Login, Signup, Reset) */}
            {mode !== 'forgot' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-300">
                    {mode === 'reset' ? 'New Password' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        clearMessages();
                      }}
                      className="text-[11px] text-slate-400 hover:text-teal-300 transition cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'login' ? 'Password' : 'At least 6 characters'}
                    className="w-full pl-9 pr-10 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (Signup, Reset) */}
            {(mode === 'signup' || mode === 'reset') && (
              <div className="space-y-1">
                <label className="block font-semibold text-slate-300">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-amber-400 mt-1">Passwords do not match.</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !isSupabaseConfigured}
              className="w-full py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs tracking-wide transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Please wait...
                </span>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot' && 'Send Reset Link'}
                    {mode === 'reset' && 'Update Password'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy Note */}
          <div className="pt-2 text-center text-[11px] text-slate-500 leading-relaxed">
            By signing in, you agree that your Kalise data is private and personal to you.
          </div>
        </div>
      </div>
    </div>
  );
};
