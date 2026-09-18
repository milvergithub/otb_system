"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { es as dayPickerEs, enUS as dayPickerEnUS } from "react-day-picker/locale"
import { CalendarIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Calendar } from "@/components/ui/calendar"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface DatePickerProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function parseISODate(value: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function parseInput(text: string): Date | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return parseISODate(trimmed)
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toISODate(date: Date): string {
  return format(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    "yyyy-MM-dd"
  )
}

const DatePicker = ({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: DatePickerProps) => {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith("es") ? es : enUS
  const dayPickerLocale = i18n.language?.startsWith("es") ? dayPickerEs : dayPickerEnUS

  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(parseISODate(value))
  const [month, setMonth] = useState<Date | undefined>(parseISODate(value))
  const [inputValue, setInputValue] = useState(() => {
    const parsed = parseISODate(value)
    return parsed ? format(parsed, "PPP", { locale }) : ""
  })
  const [syncKey, setSyncKey] = useState(() => `${value}|${i18n.language}`)

  if (syncKey !== `${value}|${i18n.language}`) {
    setSyncKey(`${value}|${i18n.language}`)
    const parsed = parseISODate(value)
    setDate(parsed)
    setMonth(parsed)
    setInputValue(parsed ? format(parsed, "PPP", { locale }) : "")
  }

  return (
    <InputGroup className={cn(className)}>
      <InputGroupInput
        id={id}
        value={inputValue}
        placeholder={placeholder ?? t("common.pickDate")}
        disabled={disabled}
        onChange={(e) => {
          const text = e.target.value
          setInputValue(text)
          const parsed = parseInput(text)
          if (parsed) {
            setDate(parsed)
            setMonth(parsed)
            onChange(toISODate(parsed))
          } else if (!text.trim()) {
            setDate(undefined)
            setMonth(undefined)
            onChange("")
          }
        }}
        onBlur={() => {
          if (!parseInput(inputValue)) {
            const parsed = parseISODate(value)
            setInputValue(parsed ? format(parsed, "PPP", { locale }) : "")
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
          }
        }}
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <InputGroupButton
                variant="ghost"
                size="icon-xs"
                aria-label={t("common.pickDate")}
                disabled={disabled}
              />
            }
          >
            <CalendarIcon />
            <span className="sr-only">{t("common.pickDate")}</span>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              locale={dayPickerLocale}
              selected={date}
              month={month}
              onMonthChange={setMonth}
              timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
              onSelect={(selected) => {
                if (selected) {
                  setDate(selected)
                  setMonth(selected)
                  setInputValue(format(selected, "PPP", { locale }))
                  onChange(toISODate(selected))
                } else {
                  setDate(undefined)
                  setMonth(undefined)
                  setInputValue("")
                  onChange("")
                }
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  )
}

export { DatePicker }
