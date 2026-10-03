'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import OpenFreeMapLayer from '@/components/maps/open-free-map-layer'

const CENTER: [number, number] = [14.5995, 120.9842]
const pin = L.divIcon({ className: 'report-location-pin', html: '<span></span>', iconSize: [30, 36], iconAnchor: [15, 36] })

type Props = { value: [number, number] | null; onChange: (value: [number, number]) => void }

function MapSizeFix() {
  const map = useMap()
  const container = map.getContainer()
  useEffect(() => {
    const resize = () => map.invalidateSize({ animate: false })
    const timer = window.setTimeout(resize, 300)
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => { window.clearTimeout(timer); observer.disconnect() }
  }, [container, map])
  return null
}

function Picker({ value, onChange }: Props) {
  useMapEvents({ click: ({ latlng }) => onChange([latlng.lat, latlng.lng]) })
  const map = useMap()
  const previous = useRef<[number, number] | null>(null)
  useEffect(() => {
    if (value && value !== previous.current) {
      previous.current = value
      map.panTo(value)
    }
  }, [map, value])
  return value ? <Marker position={value} icon={pin} draggable eventHandlers={{ dragend: (event) => { const position = event.target.getLatLng(); onChange([position.lat, position.lng]) } }} /> : null
}

export default function ReportLocationMap({ value, onChange }: Props) {
  return <div className="h-56 w-full overflow-hidden rounded-xl border border-[#1A3A6E] md:h-64"><MapContainer center={value ?? CENTER} zoom={12} scrollWheelZoom={false} className="report-location-map" touchZoom dragging><OpenFreeMapLayer /><MapSizeFix /><Picker value={value} onChange={onChange} /></MapContainer></div>
}
