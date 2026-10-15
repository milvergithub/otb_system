import { describe, expect, it } from "vitest"

import {
  chunkCoordinates,
  formatDistance,
  haversineDistance,
  nearestNeighborOrder,
  pathSegmentIndices,
  type LatLng,
} from "@/lib/utils/geo"

describe("haversineDistance", () => {
  it("returns 0 for the same point", () => {
    const p: LatLng = { lat: -17.359527, lng: -66.241607 }
    expect(haversineDistance(p, p)).toBe(0)
  })

  it("approximates a known one-degree latitude arc", () => {
    const distance = haversineDistance({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })
    expect(distance).toBeGreaterThan(111_000)
    expect(distance).toBeLessThan(111_300)
  })

  it("is symmetric", () => {
    const a: LatLng = { lat: -17.36, lng: -66.24 }
    const b: LatLng = { lat: -17.37, lng: -66.25 }
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 6)
  })
})

describe("nearestNeighborOrder", () => {
  it("visits the closest point first and chains from there", () => {
    const origin: LatLng = { lat: 0, lng: 0 }
    const points: LatLng[] = [
      { lat: 0, lng: 0.02 },
      { lat: 0, lng: 0.001 },
      { lat: 0, lng: 0.01 },
    ]
    expect(nearestNeighborOrder(origin, points)).toEqual([1, 2, 0])
  })

  it("returns an empty order for no points", () => {
    expect(nearestNeighborOrder({ lat: 0, lng: 0 }, [])).toEqual([])
  })
})

describe("chunkCoordinates", () => {
  it("keeps a single chunk when within the limit", () => {
    const coords = [1, 2, 3]
    expect(chunkCoordinates(coords, 5)).toEqual([[1, 2, 3]])
  })

  it("overlaps the boundary so consecutive chunks stay connected", () => {
    expect(chunkCoordinates([1, 2, 3, 4, 5], 2)).toEqual([
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ])
  })

  it("rejects a limit below two", () => {
    expect(() => chunkCoordinates([1, 2], 1)).toThrow()
  })
})

describe("pathSegmentIndices", () => {
  const path: LatLng[] = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 0, lng: 2 },
    { lat: 0, lng: 3 },
  ]

  it("maps each waypoint to its nearest path vertex", () => {
    const waypoints: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1.1 },
      { lat: 0, lng: 2.9 },
    ]
    expect(pathSegmentIndices(path, waypoints)).toEqual([0, 1, 3])
  })

  it("never backtracks for out-of-order waypoints", () => {
    const waypoints: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 2.9 },
      { lat: 0, lng: 0.1 },
    ]
    expect(pathSegmentIndices(path, waypoints)).toEqual([0, 3, 3])
  })

  it("returns an empty list for empty inputs", () => {
    expect(pathSegmentIndices([], [{ lat: 0, lng: 0 }])).toEqual([])
    expect(pathSegmentIndices(path, [])).toEqual([])
  })
})

describe("formatDistance", () => {
  it("formats meters below a kilometre", () => {
    expect(formatDistance(500)).toBe("500 m")
  })

  it("formats kilometres with one decimal below ten", () => {
    expect(formatDistance(1500)).toBe("1.5 km")
  })

  it("formats kilometres with no decimal above ten", () => {
    expect(formatDistance(15400)).toBe("15 km")
  })

  it("handles invalid values", () => {
    expect(formatDistance(Number.NaN)).toBe("—")
  })
})
