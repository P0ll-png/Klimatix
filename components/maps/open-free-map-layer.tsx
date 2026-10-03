'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL } from '@/lib/map-tiles'

export default function OpenFreeMapLayer() {
  const map = useMap()

  useEffect(() => {
    let disposed = false
    let removeLayer: (() => void) | undefined

    map.attributionControl.addAttribution(MAP_TILE_ATTRIBUTION)

    void import('@maplibre/maplibre-gl-leaflet')
      .then(({ maplibreGL }) => {
        if (disposed) return

        const layer = maplibreGL({
          style: MAP_TILE_URL,
          attributionControl: false,
        })
        layer.addTo(map)

        const maplibreMap = layer.getMaplibreMap()
        maplibreMap.on('error', (event) => {
          console.error('OpenFreeMap failed to load map data.', event.error)
        })
        removeLayer = () => map.removeLayer(layer)
      })
      .catch((error: unknown) => {
        if (!disposed) console.error('Failed to initialize OpenFreeMap.', error)
      })

    return () => {
      disposed = true
      removeLayer?.()
      map.attributionControl.removeAttribution(MAP_TILE_ATTRIBUTION)
    }
  }, [map])

  return null
}
