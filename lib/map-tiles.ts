const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export const MAP_TILE_URL = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`
export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
