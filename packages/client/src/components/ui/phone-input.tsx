"use client"

import { COUNTRIES, getDialCode } from "@/lib/phone"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PhoneInputProps {
  country: string
  onCountryChange: (code: string) => void
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  id?: string
  autoFocus?: boolean
}

export function PhoneInput({
  country,
  onCountryChange,
  value,
  onChange,
  placeholder = "Ej: 71234567",
  disabled = false,
  invalid = false,
  id,
  autoFocus,
}: PhoneInputProps) {
  const dial = getDialCode(country)

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "")
    if (digits.startsWith(dial) && digits.length > dial.length) {
      onChange(digits.slice(dial.length))
      return
    }
    onChange(digits)
  }

  const selected = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0]

  return (
    <div className="flex items-center gap-2">
      <Select
        value={country}
        onValueChange={(v) => {
          if (v) onCountryChange(v)
        }}
        disabled={disabled}
      >
        <SelectTrigger
          className="w-fit min-w-[70px]"
          aria-label="País"
        >
          <SelectValue>
            {selected.flag} +{dial}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.flag} +{c.dialCode} {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className="flex-1"
      />
    </div>
  )
}
