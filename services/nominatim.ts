export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
}

export class NominatimService {
  private static readonly BASE_URL = 'https://nominatim.openstreetmap.org';

  static async searchLocation(query: string): Promise<NominatimResult[]> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TripFlow-App/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Nominatim search error:', error);
      throw new Error('Impossible de rechercher la localisation');
    }
  }

  static async reverseGeocode(lat: number, lon: number): Promise<NominatimResult | null> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TripFlow-App/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors du géocodage inverse');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Nominatim reverse geocode error:', error);
      return null;
    }
  }
}