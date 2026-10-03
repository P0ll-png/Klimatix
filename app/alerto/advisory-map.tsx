'use client'
import { MapContainer, Marker } from 'react-leaflet'
import L from 'leaflet'
import type { BarangayRisk } from '@/lib/advisory'
import type { EvacuationCenter } from '@/lib/evacuation'
import OpenFreeMapLayer from '@/components/maps/open-free-map-layer'
import 'leaflet/dist/leaflet.css'
function icon(color: string) { return L.divIcon({ className:'', html:`<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #172554;box-shadow:0 1px 5px rgba(15,23,42,.5)"></span>`, iconSize:[14,14], iconAnchor:[7,7] }) }
export default function AdvisoryMap({ risk, centers }: { risk: BarangayRisk; centers: (EvacuationCenter & { distance:number })[] }) { return <div className="h-48 w-full border-y border-[#315182] grayscale-[.15]"><MapContainer center={[risk.lat,risk.lng]} zoom={12} scrollWheelZoom={true} className="h-full w-full"><OpenFreeMapLayer /><Marker position={[risk.lat,risk.lng]} icon={icon('#FF6B35')} />{centers.map((center)=><Marker key={center.id} position={[center.lat,center.lng]} icon={icon(center.status==='Full'?'#FF8F91':'#87CEEB')} />)}</MapContainer></div> }
