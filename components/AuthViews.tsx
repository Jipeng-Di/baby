'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import type {User} from '@supabase/supabase-js';
import {supabase} from '@/lib/supabase';
import {tr} from '@/lib/i18n';
import {getError} from '@/lib/errors';
import {Alert, card, input, primary} from './ui';

export function AuthView({onError, user}: {onError: (e: unknown) => void; user: User | null}) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const sb = supabase();
      if (mode === 'forgot') {
        const {error: err} = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
        setMessage(
          tr(
            '如果该邮箱已注册，重置邮件已发送。',
            'If this email is registered, a reset email has been sent.',
          ),
        );
      } else if (mode === 'signup') {
        const {data, error: err} = await sb.auth.signUp({
          email,
          password,
          options: {emailRedirectTo: `${window.location.origin}/auth`, data: {display_name: name.trim()}},
        });
        if (err) throw err;
        if (data.session) {
          await sb.from('profiles').upsert({id: data.user!.id, display_name: name.trim()});
          router.replace('/onboarding');
        } else
          setMessage(
            tr(
              '注册成功。请查收验证邮件，然后登录。',
              'Account created. Check your email to verify it, then sign in.',
            ),
          );
      } else {
        const {data, error: err} = await sb.auth.signInWithPassword({email, password});
        if (err) throw err;
        const pending = localStorage.getItem('pendingInvite');
        router.replace(pending ? `/join/${pending}` : '/today');
        if (data.user) {
          await sb
            .from('profiles')
            .upsert({id: data.user.id, display_name: data.user.user_metadata?.display_name || ''});
        }
      }
    } catch (e) {
      setError(getError(e));
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
      <div className="mb-10">
        <img src="/icon.svg" alt="" className="h-16 w-16 rounded-[18px]" />
        <p className="mt-8 text-sm font-semibold tracking-[.2em] text-(--brand)">
          {'FEEDBOOK · BABY FEEDING'}
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight">
          {tr('每一顿奶，', 'Every feed,')}
          <br />
          {tr('都记得轻松一点。', 'logged with ease.')}
        </h1>
        <p className="mt-4 text-(--muted)">
          {tr('为忙碌的家庭准备的简单喝奶记录。', 'Simple feeding log for busy families.')}
        </p>
      </div>
      <form className={card} onSubmit={submit}>
        <h2 className="mb-5 text-xl font-semibold">
          {mode === 'signup'
            ? tr('创建账号', 'Create account')
            : mode === 'forgot'
              ? tr('重置密码', 'Reset password')
              : tr('欢迎回来', 'Welcome back')}
        </h2>
        {message && <Alert text={message} good />}
        {error && <Alert text={error} />}
        <div className="space-y-4">
          {mode === 'signup' && (
            <label className="block text-sm font-medium">
              {tr('称呼', 'Your name')}
              <input
                className={`${input} mt-2`}
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={100}
                required
                autoComplete="name"
              />
            </label>
          )}
          <label className="block text-sm font-medium">
            {tr('邮箱', 'Email')}
            <input
              className={`${input} mt-2`}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          {mode !== 'forgot' && (
            <label className="block text-sm font-medium">
              {tr('密码', 'Password')}
              <input
                className={`${input} mt-2`}
                type="password"
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </label>
          )}
        </div>
        <button className={`${primary} mt-6`} disabled={busy}>
          {busy
            ? tr('请稍候…', 'Please wait…')
            : mode === 'signup'
              ? tr('注册', 'Sign up')
              : mode === 'forgot'
                ? tr('发送重置邮件', 'Send reset email')
                : tr('登录', 'Sign in')}
        </button>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-(--brand)">
          <button
            type="button"
            className="min-h-11"
            onClick={() => {
              setMode(mode === 'signup' ? 'login' : 'signup');
              setError('');
              setMessage('');
            }}
          >
            {mode === 'signup'
              ? tr('已有账号？登录', 'Have an account? Sign in')
              : tr('创建账号', 'Create account')}
          </button>
          <button
            type="button"
            className="min-h-11"
            onClick={() => {
              setMode(mode === 'forgot' ? 'login' : 'forgot');
              setError('');
              setMessage('');
            }}
          >
            {mode === 'forgot' ? tr('返回登录', 'Back to sign in') : tr('忘记密码', 'Forgot password')}
          </button>
        </div>
      </form>
      {user && (
        <button className="mt-5 text-(--brand)" onClick={() => router.push('/today')}>
          {tr('进入应用 →', 'Open app →')}
        </button>
      )}
    </main>
  );
}
export function ResetView({onError}: {onError: (e: unknown) => void}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const {error: err} = await supabase().auth.updateUser({password});
      if (err) throw err;
      router.replace('/today');
    } catch (e) {
      setError(getError(e));
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <form className={`${card} w-full`} onSubmit={submit}>
        <h1 className="text-2xl font-semibold">{tr('设置新密码', 'Set a new password')}</h1>
        {error && <Alert text={error} />}
        <label className="mt-6 block text-sm">
          {tr('新密码', 'New password')}
          <input
            className={`${input} mt-2`}
            type="password"
            minLength={6}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>
        <button className={`${primary} mt-5`} disabled={busy}>
          {tr('保存新密码', 'Save password')}
        </button>
      </form>
    </main>
  );
}
