"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export interface TimePickerProps {
    /**
     * Time value in 24-hour format.
     * Examples: "08:00", "13:30", "23:45"
     */
    value?: string

    /**
     * Called with a 24-hour formatted time.
     * Example: "08:00", "13:30"
     */
    onChange?: (value: string) => void

    /**
     * Minute interval.
     * Examples: 1, 5, 10, 15, 30
     */
    minuteStep?: number

    /**
     * Minimum selectable time in HH:mm format.
     */
    minTime?: string

    /**
     * Maximum selectable time in HH:mm format.
     */
    maxTime?: string

    placeholder?: string

    disabled?: boolean

    className?: string

    id?: string

    name?: string

    "aria-label"?: string
}

interface TimeParts {
    hour: number
    minute: number
    period: "AM" | "PM"
}

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1)

const DEFAULT_MINUTE_STEP = 1

function parseTime(value?: string): TimeParts {
    if (!value) {
        return {
            hour: 12,
            minute: 0,
            period: "AM",
        }
    }

    const normalized = value.trim()

    // Support HH:mm:ss
    const parts = normalized.split(":")
    const hour24 = Number(parts[0])
    const minute = Number(parts[1])

    if (
        !Number.isFinite(hour24) ||
        !Number.isFinite(minute) ||
        hour24 < 0 ||
        hour24 > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return {
            hour: 12,
            minute: 0,
            period: "AM",
        }
    }

    const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM"

    let hour12 = hour24 % 12

    if (hour12 === 0) {
        hour12 = 12
    }

    return {
        hour: hour12,
        minute,
        period,
    }
}

function to24Hour(parts: TimeParts): number {
    if (parts.period === "AM") {
        return parts.hour === 12 ? 0 : parts.hour
    }

    return parts.hour === 12 ? 12 : parts.hour + 12
}

function formatTime(parts: TimeParts): string {
    const hour24 = to24Hour(parts)

    return `${String(hour24).padStart(2, "0")}:${String(parts.minute).padStart(
        2,
        "0",
    )}`
}

function formatDisplayTime(value?: string): string {
    if (!value) {
        return ""
    }

    const parts = parseTime(value)

    return `${String(parts.hour).padStart(2, "0")}:${String(
        parts.minute,
    ).padStart(2, "0")} ${parts.period}`
}

function timeToMinutes(value?: string): number | null {
    if (!value) {
        return null
    }

    const parts = value.split(":")

    if (parts.length < 2) {
        return null
    }

    const hour = Number(parts[0])
    const minute = Number(parts[1])

    if (
        !Number.isFinite(hour) ||
        !Number.isFinite(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null
    }

    return hour * 60 + minute
}

function isTimeAllowed(
    hour: number,
    minute: number,
    minTime?: string,
    maxTime?: string,
): boolean {
    const selected = hour * 60 + minute

    const min = timeToMinutes(minTime)
    const max = timeToMinutes(maxTime)

    if (min !== null && selected < min) {
        return false
    }

    if (max !== null && selected > max) {
        return false
    }

    return true
}

function generateMinutes(step: number): number[] {
    const safeStep = Math.min(Math.max(step, 1), 60)

    const minutes: number[] = []

    for (let minute = 0; minute < 60; minute += safeStep) {
        minutes.push(minute)
    }

    return minutes
}

function getInitialParts(
    value: string | undefined,
    minuteStep: number,
): TimeParts {
    const parts = parseTime(value)

    const minutes = generateMinutes(minuteStep)

    const closestMinute = minutes.reduce((closest, current) => {
        const currentDistance = Math.abs(current - parts.minute)
        const closestDistance = Math.abs(closest - parts.minute)

        return currentDistance < closestDistance ? current : closest
    }, minutes[0] ?? 0)

    return {
        ...parts,
        minute: closestMinute,
    }
}

export function TimePicker({
                               value,
                               onChange,
                               minuteStep = DEFAULT_MINUTE_STEP,
                               minTime,
                               maxTime,
                               placeholder = "Seleccionar hora",
                               disabled = false,
                               className,
                               id,
                               name,
                               "aria-label": ariaLabel = "Seleccionar hora",
                           }: TimePickerProps) {
    const [open, setOpen] = React.useState(false)

    const safeMinuteStep = React.useMemo(
        () => Math.min(Math.max(Math.floor(minuteStep), 1), 60),
        [minuteStep],
    )

    const [parts, setParts] = React.useState<TimeParts>(() =>
        getInitialParts(value, safeMinuteStep),
    )

    const hoursRef = React.useRef<HTMLDivElement>(null)
    const minutesRef = React.useRef<HTMLDivElement>(null)
    const periodsRef = React.useRef<HTMLDivElement>(null)

    const [syncKey, setSyncKey] = React.useState(
        `${value}|${safeMinuteStep}`,
    )

    if (syncKey !== `${value}|${safeMinuteStep}`) {
        setSyncKey(`${value}|${safeMinuteStep}`)
        setParts(getInitialParts(value, safeMinuteStep))
    }

    const minutes = React.useMemo(
        () => generateMinutes(safeMinuteStep),
        [safeMinuteStep],
    )

    const selected24Hour = to24Hour(parts)

    const isHourDisabled = React.useCallback(
        (hour12: number) => {
            return minutes.every((minute) => {
                const hour24 =
                    parts.period === "AM"
                        ? hour12 === 12
                            ? 0
                            : hour12
                        : hour12 === 12
                            ? 12
                            : hour12 + 12

                return !isTimeAllowed(hour24, minute, minTime, maxTime)
            })
        },
        [parts.period, minutes, minTime, maxTime],
    )

    const isMinuteDisabled = React.useCallback(
        (minute: number) => {
            return !isTimeAllowed(
                selected24Hour,
                minute,
                minTime,
                maxTime,
            )
        },
        [selected24Hour, minTime, maxTime],
    )

    const isPeriodDisabled = React.useCallback(
        (period: "AM" | "PM") => {
            return !HOURS.some((hour12) => {
                const hour24 =
                    period === "AM"
                        ? hour12 === 12
                            ? 0
                            : hour12
                        : hour12 === 12
                            ? 12
                            : hour12 + 12

                return minutes.some((minute) =>
                    isTimeAllowed(hour24, minute, minTime, maxTime),
                )
            })
        },
        [minutes, minTime, maxTime],
    )

    const updateTime = React.useCallback(
        (nextParts: TimeParts) => {
            const hour24 = to24Hour(nextParts)

            if (
                !isTimeAllowed(
                    hour24,
                    nextParts.minute,
                    minTime,
                    maxTime,
                )
            ) {
                return
            }

            setParts(nextParts)

            onChange?.(formatTime(nextParts))
        },
        [onChange, minTime, maxTime],
    )

    const handleHourChange = (hour: number) => {
        updateTime({
            ...parts,
            hour,
        })
    }

    const handleMinuteChange = (minute: number) => {
        updateTime({
            ...parts,
            minute,
        })
    }

    const handlePeriodChange = (period: "AM" | "PM") => {
        updateTime({
            ...parts,
            period,
        })
    }

    const scrollToSelected = React.useCallback(() => {
        requestAnimationFrame(() => {
            const containerElements = [
                hoursRef.current,
                minutesRef.current,
                periodsRef.current,
            ]

            containerElements.forEach((container) => {
                if (!container) {
                    return
                }

                const selected = container.querySelector<HTMLElement>(
                    '[data-selected="true"]',
                )

                selected?.scrollIntoView({
                    block: "center",
                    behavior: "instant",
                })
            })
        })
    }, [])

    React.useEffect(() => {
        if (open) {
            scrollToSelected()
        }
    }, [open, parts, scrollToSelected])

    const displayValue = formatDisplayTime(value)

    return (
        <div className="relative">
            {name ? (
                <input
                    type="hidden"
                    name={name}
                    value={value ?? ""}
                    readOnly
                />
            ) : null}

            <Popover
                open={open}
                onOpenChange={setOpen}
            >
                <PopoverTrigger
                    render={
                        <Button
                            id={id}
                            type="button"
                            variant="outline"
                            disabled={disabled}
                            aria-label={ariaLabel}
                            className={cn(
                                "h-10 w-full justify-between rounded-md px-3 font-normal",
                                !displayValue && "text-muted-foreground",
                                className,
                            )}
                        >
                            <span className="truncate">
                                {displayValue || placeholder}
                            </span>

                            <Clock className="size-4 shrink-0 opacity-60" />
                        </Button>
                    }
                />

                <PopoverContent
                    align="start"
                    side="bottom"
                    sideOffset={4}
                    className="w-[300px] p-0"
                >
                    <div className="p-3">
                        <div className="mb-3 text-sm font-medium">
                            Seleccionar hora
                        </div>

                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                            {/* Hours */}
                            <TimeColumn
                                ref={hoursRef}
                                label="Hora"
                            >
                                {HOURS.map((hour) => {
                                    const selected = parts.hour === hour
                                    const disabled = isHourDisabled(hour)

                                    return (
                                        <TimeOption
                                            key={hour}
                                            selected={selected}
                                            disabled={disabled}
                                            onClick={() => handleHourChange(hour)}
                                        >
                                            {String(hour).padStart(2, "0")}
                                        </TimeOption>
                                    )
                                })}
                            </TimeColumn>

                            {/* Minutes */}
                            <TimeColumn
                                ref={minutesRef}
                                label="Min"
                            >
                                {minutes.map((minute) => {
                                    const selected = parts.minute === minute
                                    const disabled = isMinuteDisabled(minute)

                                    return (
                                        <TimeOption
                                            key={minute}
                                            selected={selected}
                                            disabled={disabled}
                                            onClick={() => handleMinuteChange(minute)}
                                        >
                                            {String(minute).padStart(2, "0")}
                                        </TimeOption>
                                    )
                                })}
                            </TimeColumn>

                            {/* AM / PM */}
                            <TimeColumn
                                ref={periodsRef}
                                label=""
                                className="min-w-[64px]"
                            >
                                {(["AM", "PM"] as const).map((period) => {
                                    const selected = parts.period === period
                                    const disabled = isPeriodDisabled(period)

                                    return (
                                        <TimeOption
                                            key={period}
                                            selected={selected}
                                            disabled={disabled}
                                            onClick={() => handlePeriodChange(period)}
                                        >
                                            {period}
                                        </TimeOption>
                                    )
                                })}
                            </TimeColumn>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                            {formatDisplayTime(formatTime(parts))}
                        </div>

                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setOpen(false)}
                        >
                            Listo
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

interface TimeColumnProps
    extends React.HTMLAttributes<HTMLDivElement> {
    label?: string
}

const TimeColumn = React.forwardRef<
    HTMLDivElement,
    TimeColumnProps
>(({ className, label, children, ...props }, ref) => {
    return (
        <div className="min-w-0">
            {label ? (
                <div className="mb-1 px-2 text-center text-xs font-medium text-muted-foreground">
                    {label}
                </div>
            ) : (
                <div className="mb-1 h-4" />
            )}

            <div
                ref={ref}
                role="listbox"
                className={cn(
                    "scrollbar-thin h-[240px] overflow-y-auto rounded-md border bg-background p-1",
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </div>
    )
})

TimeColumn.displayName = "TimeColumn"

interface TimeOptionProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    selected?: boolean
}

function TimeOption({
                        selected,
                        disabled,
                        className,
                        children,
                        ...props
                    }: TimeOptionProps) {
    return (
        <button
            type="button"
            role="option"
            aria-selected={selected}
            data-selected={selected}
            disabled={disabled}
            className={cn(
                "flex h-9 w-full items-center justify-center rounded-md text-sm font-medium",
                "transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-30",
                selected &&
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                className,
            )}
            {...props}
        >
            {children}
        </button>
    )
}