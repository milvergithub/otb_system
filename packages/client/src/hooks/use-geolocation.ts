import { useCallback, useEffect, useRef, useState } from "react"

export interface GeoPosition {
  lat: number
  lng: number
  accuracy: number
}

interface UseGeolocationOptions {
  onError?: (error: GeolocationPositionError) => void
  onPosition?: (position: GeoPosition) => void
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [watching, setWatching] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const onErrorRef = useRef(options.onError)
  const onPositionRef = useRef(options.onPosition)

  useEffect(() => {
    onErrorRef.current = options.onError
    onPositionRef.current = options.onPosition
  })

  const supported =
    typeof navigator !== "undefined" && "geolocation" in navigator

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setWatching(false)
  }, [])

  const start = useCallback(() => {
    if (!supported || watchIdRef.current !== null) return
    setWatching(true)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (result) => {
        const next: GeoPosition = {
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracy: result.coords.accuracy,
        }
        setPosition(next)
        onPositionRef.current?.(next)
      },
      (error) => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
          watchIdRef.current = null
        }
        setWatching(false)
        onErrorRef.current?.(error)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    )
  }, [supported])

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return { position, watching, supported, start, stop }
}
