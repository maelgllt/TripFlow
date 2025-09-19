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
      const url = `${this.BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TripFlow-App/1.0',
          'Accept': 'application/json',
        },
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Nominatim: Error response:', errorText);
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Vérifier que data est un tableau
      if (!Array.isArray(data)) {
        console.error('Nominatim: Response is not an array:', data);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Nominatim search error details:', error);
      
      // Propager l'erreur originale plutôt que de la masquer
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Pas de connexion internet');
      }
      
      if (error instanceof Error) {
        throw error; // Propager l'erreur originale
      }
      
      throw new Error('Erreur inconnue lors de la recherche');
    }
  }

  static async reverseGeocode(lat: number, lon: number): Promise<NominatimResult | null> {
    try {
      const url = `${this.BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TripFlow-App/1.0',
          'Accept': 'application/json',
        },
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Nominatim reverse: Error response:', errorText);
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Nominatim reverse geocode error:', error);
      return null;
    }
  }
}