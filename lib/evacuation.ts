import { haversineKm, type BarangayRisk } from './advisory'
export type EvacuationCenter = { id: string; name: string; address: string; lat: number; lng: number; capacity: number; status: 'Open' | 'Standby' | 'Full' }
export const evacuationCenters: EvacuationCenter[] = [
 { id:'ec-1', name:'Marikina Sports Center', address:'Sumulong Highway, Marikina', lat:14.635, lng:121.098, capacity:1200, status:'Open' },
 { id:'ec-2', name:'Concepcion Elementary School', address:'J. P. Rizal St., Marikina', lat:14.639, lng:121.105, capacity:450, status:'Standby' },
 { id:'ec-3', name:'Nangka High School', address:'Nangka, Marikina', lat:14.658, lng:121.105, capacity:700, status:'Full' },
 { id:'ec-4', name:'Quezon City Memorial Circle', address:'Elliptical Road, Quezon City', lat:14.650, lng:121.049, capacity:1800, status:'Open' },
 { id:'ec-5', name:'Novaliches High School', address:'Bayan, Quezon City', lat:14.721, lng:121.047, capacity:900, status:'Standby' },
 { id:'ec-6', name:'Manila Science High School', address:'Taft Avenue, Manila', lat:14.584, lng:120.981, capacity:800, status:'Open' },
 { id:'ec-7', name:'San Andres Sports Complex', address:'P. Gil Street, Manila', lat:14.567, lng:120.994, capacity:650, status:'Full' },
 { id:'ec-8', name:'Pasig City Sports Complex', address:'Meralco Avenue, Pasig', lat:14.576, lng:121.081, capacity:1100, status:'Open' },
 { id:'ec-9', name:'Pinagbuhatan Elementary School', address:'Pasig Boulevard, Pasig', lat:14.556, lng:121.095, capacity:500, status:'Standby' },
 { id:'ec-10', name:'Western Bicutan Elementary School', address:'Western Bicutan, Taguig', lat:14.505, lng:121.045, capacity:600, status:'Open' },
 { id:'ec-11', name:'Signal Village National High School', address:'Signal Village, Taguig', lat:14.495, lng:121.052, capacity:750, status:'Full' },
]
export function nearestCenters(barangay: BarangayRisk) { return evacuationCenters.map((center) => ({ ...center, distance: haversineKm(barangay, center) })).sort((a,b) => (a.status === 'Full' ? 1 : 0) - (b.status === 'Full' ? 1 : 0) || a.distance - b.distance).slice(0,3) }
