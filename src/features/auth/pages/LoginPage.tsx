import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../../components/common/Button'
import { Panel } from '../../../components/common/Panel'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { FormField } from '../../../components/forms/FormField'
import { Input } from '../../../components/forms/Input'
import { Brand } from '../../../components/layout/Brand'
import { usePageTitle } from '../../../hooks/usePageTitle'
import { AppError } from '../../../lib/errors/AppError'
import { isSupabaseConfigured } from '../../../lib/supabase/client'
import { useAuth } from '../hooks/useAuth'
import { validateCredentials } from '../validation'
import type { AccessMode, CredentialsErrors } from '../validation'

type LocationState = { from?: string } | null

/** Acceso privado: la aplicación no muestra datos sin sesión (RLS en la base). */
export const LoginPage = () => {
  usePageTitle('Acceso privado')

  const { status, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState)?.from ?? '/cameras'

  const [mode, setMode] = useState<AccessMode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<CredentialsErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const configured = isSupabaseConfigured()

  if (status === 'authenticated') return <Navigate to={from} replace />

  const validateField = (field: keyof CredentialsErrors) => {
    const next = validateCredentials({ email, password }, mode)
    setErrors((previous) => ({ ...previous, [field]: next[field] }))
  }

  const switchMode = () => {
    setMode((previous) => (previous === 'signIn' ? 'signUp' : 'signIn'))
    setErrors({})
    setFormError(null)
    setNotice(null)
    setPassword('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setNotice(null)

    const nextErrors = validateCredentials({ email, password }, mode)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      if (mode === 'signIn') {
        await signIn(email, password)
        navigate(from, { replace: true })
      } else {
        const result = await signUp(email, password)
        if (result.needsEmailConfirmation) {
          setNotice('Cuenta creada. Revisa tu correo para confirmarla y después inicia sesión.')
          setMode('signIn')
          setPassword('')
        } else {
          navigate(from, { replace: true })
        }
      }
    } catch (error) {
      setFormError(error instanceof AppError ? error.message : 'No se pudo completar el acceso. Reintenta.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Brand />
        </div>

        <Panel className="mt-8">
          <h1 className="text-base font-medium tracking-tight text-ink">
            {mode === 'signIn' ? 'Acceso privado' : 'Crear cuenta'}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            {mode === 'signIn'
              ? 'Inicia sesión para ver tus cámaras, versiones y configuraciones.'
              : 'La cuenta solo sirve para aislar tus datos: nada se comparte con otros usuarios.'}
          </p>

          {!configured && (
            <ErrorState
              className="mt-5"
              title="Falta configurar Supabase"
              description="Copia .env.example a .env.local y define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY."
            />
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <FormField id="email" label="Correo electrónico" error={errors.email} required>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => validateField('email')}
                disabled={!configured || submitting}
              />
            </FormField>

            <FormField
              id="password"
              label="Contraseña"
              hint={mode === 'signUp' ? 'Al menos 6 caracteres.' : undefined}
              error={errors.password}
              required
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                value={password}
                invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : mode === 'signUp' ? 'password-hint' : undefined}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => validateField('password')}
                disabled={!configured || submitting}
              />
            </FormField>

            {formError && (
              <p role="alert" className="text-xs leading-relaxed text-danger">
                {formError}
              </p>
            )}

            {notice && (
              <p role="status" className="text-xs leading-relaxed text-ink-muted">
                {notice}
              </p>
            )}

            <Button type="submit" variant="primary" className="w-full" loading={submitting} disabled={!configured}>
              {mode === 'signIn' ? 'Entrar' : 'Crear cuenta'}
            </Button>
          </form>

          <div className="mt-5 border-t border-line pt-4">
            <button
              type="button"
              onClick={switchMode}
              className="rounded-control text-xs text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {mode === 'signIn' ? '¿Primera vez? Crear una cuenta' : 'Ya tengo cuenta: iniciar sesión'}
            </button>
          </div>
        </Panel>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-ink-disabled">
          Los datos viven en tu proyecto de Supabase y RLS impide que otra cuenta los vea.
        </p>
      </div>
    </div>
  )
}
