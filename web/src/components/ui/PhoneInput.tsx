import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type PhoneCountry = {
  code: string
  dialCode: string
  label: string
}

const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'PT', dialCode: '+351', label: 'PT · +351' },
  { code: 'ES', dialCode: '+34', label: 'ES · +34' },
  { code: 'FR', dialCode: '+33', label: 'FR · +33' },
  { code: 'GB', dialCode: '+44', label: 'GB · +44' },
  { code: 'IE', dialCode: '+353', label: 'IE · +353' },
  { code: 'DE', dialCode: '+49', label: 'DE · +49' },
  { code: 'IT', dialCode: '+39', label: 'IT · +39' },
  { code: 'CH', dialCode: '+41', label: 'CH · +41' },
  { code: 'LU', dialCode: '+352', label: 'LU · +352' },
  { code: 'BE', dialCode: '+32', label: 'BE · +32' },
  { code: 'NL', dialCode: '+31', label: 'NL · +31' },
  { code: 'BR', dialCode: '+55', label: 'BR · +55' },
  { code: 'AO', dialCode: '+244', label: 'AO · +244' },
  { code: 'MZ', dialCode: '+258', label: 'MZ · +258' },
  { code: 'CV', dialCode: '+238', label: 'CV · +238' },
  { code: 'US', dialCode: '+1', label: 'US · +1' },
]

const DEFAULT_COUNTRY_CODE = 'PT'

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function stripDialCodePrefix(value: string, dialCode: string) {
  const digits = normalizeDigits(value)
  const dialDigits = normalizeDigits(dialCode)

  if (digits.startsWith(dialDigits)) return digits.slice(dialDigits.length)
  if (digits.startsWith(`00${dialDigits}`)) return digits.slice(dialDigits.length + 2)
  return digits
}

function parsePhoneValue(value: string | undefined) {
  const normalizedValue = (value ?? '').trim()

  if (!normalizedValue) {
    return { countryCode: DEFAULT_COUNTRY_CODE, localNumber: '' }
  }

  const sortedCountries = [...PHONE_COUNTRIES].sort(
    (left, right) => right.dialCode.length - left.dialCode.length
  )

  const matchedCountry = sortedCountries.find((country) => normalizedValue.startsWith(country.dialCode))

  if (matchedCountry) {
    return {
      countryCode: matchedCountry.code,
      localNumber: stripDialCodePrefix(normalizedValue, matchedCountry.dialCode),
    }
  }

  return {
    countryCode: DEFAULT_COUNTRY_CODE,
    localNumber: normalizeDigits(normalizedValue),
  }
}

function buildPhoneValue(countryCode: string, localNumber: string) {
  const trimmedLocal = normalizeDigits(localNumber)
  if (!trimmedLocal) return ''

  const country = PHONE_COUNTRIES.find((item) => item.code === countryCode) ?? PHONE_COUNTRIES[0]
  return `${country.dialCode}${trimmedLocal}`
}

interface PhoneInputProps {
  label?: string
  error?: string
  hint?: string
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  id?: string
  name?: string
  className?: string
}

export function PhoneInput({
  label,
  error,
  hint,
  value,
  onChange,
  placeholder = '912 345 678',
  disabled,
  required,
  id,
  name,
  className,
}: PhoneInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-') ?? 'phone-input'
  const parsedValue = useMemo(() => parsePhoneValue(value), [value])
  const [countryCode, setCountryCode] = useState(parsedValue.countryCode)
  const [localNumber, setLocalNumber] = useState(parsedValue.localNumber)

  useEffect(() => {
    setCountryCode(parsedValue.countryCode)
    setLocalNumber(parsedValue.localNumber)
  }, [parsedValue.countryCode, parsedValue.localNumber])

  const controlClasses = cn('ui-control', error && 'ui-control-error')

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="ui-label">
          {label}
        </label>
      )}

      <div className={cn('grid gap-2 grid-cols-[120px_minmax(0,1fr)]', className)}>
        <div className="relative">
          <select
            value={countryCode}
            onChange={(event) => {
              const nextCountryCode = event.target.value
              setCountryCode(nextCountryCode)
              onChange(buildPhoneValue(nextCountryCode, localNumber))
            }}
            disabled={disabled}
            className={cn(controlClasses, 'appearance-none pr-10')}
            aria-label={label ? `${label} país` : 'País'}
          >
            {PHONE_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        </div>

        <input
          id={inputId}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={localNumber}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={controlClasses}
          onChange={(event) => {
            const nextLocalNumber = stripDialCodePrefix(event.target.value, (PHONE_COUNTRIES.find((item) => item.code === countryCode) ?? PHONE_COUNTRIES[0]).dialCode)
            setLocalNumber(nextLocalNumber)
            onChange(buildPhoneValue(countryCode, nextLocalNumber))
          }}
        />
      </div>

      {error && <p className="text-xs text-danger-600">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}
