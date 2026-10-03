
'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '@/lib/supabase/client'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const SEVERITY_COLORS = {
  ankle: '#22c55e',
  knee: '#eab308',
  waist: '#f97316',
  chest: '#ef4444',
  above_head: '#7f1d1d',
}

export default function BantayMap() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [reportCount, setReportCount] = useState(0)

  const loadFloodReports = useCallback(async () => {
    if (!map.current) return

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: reports, error } = await supabase
      .from('flood_reports')
      .select('*')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load reports:', error)
      return
    }

    setReportCount(reports?.length ?? 0)

    const geojson = {
      type: 'FeatureCollection',
      features: (reports ?? []).map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
        properties: {
          id: r.id,
          severity: r.severity,
          description: r.description || 'No description',
          created_at: r.created_at,
          weight: { ankle: 1, knee: 2, waist: 3, chest: 4, above_head: 5 }[r.severity] || 1,
        },
      })),
    }

    const currentMap = map.current
    if (currentMap.getSource('flood-reports')) {
      currentMap.removeSource('flood-reports')
    }

    if (currentMap.getLayer('flood-heatmap')) {
      currentMap.removeLayer('flood-heatmap')
    }

    if (currentMap.getLayer('flood-pins')) {
      currentMap.removeLayer('flood-pins')
    }

    currentMap.addSource('flood-reports', { type: 'geojson', data: geojson })

    currentMap.addLayer({
      id: 'flood-heatmap',
      type: 'heatmap',
      source: 'flood-reports',
      maxzoom: 15,
      paint: {
        'heatmap-weight': ['get', 'weight'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 3],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 20, 15, 40],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, '#22c55e',
          0.4, '#eab308',
          0.6, '#f97316',
          0.8, '#ef4444',
          1, '#7f1d1d',
        ],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.8, 16, 0],
      },
    })

    currentMap.addLayer({
      id: 'flood-pins',
      type: 'circle',
      source: 'flood-reports',
      minzoom: 13,
      paint: {
        'circle-radius': 8,
        'circle-color': [
          'match', ['get', 'severity'],
          'ankle', '#22c55e',
          'knee', '#eab308',
          'waist', '#f97316',
          'chest', '#ef4444',
          'above_head', '#7f1d1d',
          '#9ca3af',
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })

    currentMap.on('click', 'flood-pins', (e) => {
      const props = e.features[0].properties
      const time = new Date(props.created_at).toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
      })

      new mapboxgl.Popup({ offset: 15 })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family:system-ui; padding:4px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
              <span style="background:${SEVERITY_COLORS[props.severity]}; color:white; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700;">
                ${props.severity.replace('_', ' ').toUpperCase()}
              </span>
              <span style="color:#9ca3af; font-size:11px;">${time}</span>
            </div>
            <p style="margin:0; font-size:13px; color:#333;">${props.description}</p>
          </div>
        `)
        .addTo(currentMap)
    })

    currentMap.on('mouseenter', 'flood-pins', () => {
      currentMap.getCanvas().style.cursor = 'pointer'
    })

    currentMap.on('mouseleave', 'flood-pins', () => {
      currentMap.getCanvas().style.cursor = ''
    })
  }, [])

  const subscribeToRealtime = useCallback(() => {
    supabase
      .channel('flood-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'flood_reports',
        },
        (payload) => {
          const r = payload.new
          const source = map.current?.getSource('flood-reports')
          if (!source) return

          const currentData = source._data
          currentData.features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
            properties: {
              id: r.id,
              severity: r.severity,
              description: r.description || 'No description',
              created_at: r.created_at,
              weight: { ankle: 1, knee: 2, waist: 3, chest: 4, above_head: 5 }[r.severity] || 1,
            },
          })

          source.setData(currentData)
          setReportCount((prev) => prev + 1)
        }
      )
      .subscribe()
  }, [])

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const newMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [120.9842, 14.5995],
      zoom: 11,
    })

    map.current = newMap

    newMap.addControl(new mapboxgl.NavigationControl(), 'top-right')
    newMap.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right'
    )

    newMap.on('load', () => {
      void loadFloodReports()
      subscribeToRealtime()
    })

    return () => {
      newMap.remove()
      map.current = null
    }
  }, [loadFloodReports, subscribeToRealtime])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(17,24,39,0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: 12,
          padding: '12px 16px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ color: '#f97316', fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>
          🌊 BANTAY MAP
        </div>
        <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
          {reportCount} reports in last 24hrs
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 16,
          background: 'rgba(17,24,39,0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: 12,
          padding: 12,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
          FLOOD SEVERITY
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {Object.entries(SEVERITY_COLORS).map(([level, color]) => (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: color,
                  display: 'inline-block',
                }}
              />
              <span style={{ color: '#d1d5db', fontSize: 10 }}>{level.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

