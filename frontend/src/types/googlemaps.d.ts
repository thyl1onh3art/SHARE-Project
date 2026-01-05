/// <reference types="@types/google.maps" />

// Declare google namespace globally
declare namespace google {
  namespace maps {
    class Geocoder {
      geocode(
        request: GeocoderRequest,
        callback: (
          results: GeocoderResult[] | null,
          status: GeocoderStatus
        ) => void
      ): void;
    }
    
    interface GeocoderRequest {
      address?: string;
      location?: LatLng | LatLngLiteral;
      placeId?: string;
      region?: string;
      bounds?: LatLngBounds | LatLngBoundsLiteral;
      componentRestrictions?: GeocoderComponentRestrictions;
    }
    
    interface GeocoderResult {
      address_components: GeocoderAddressComponent[];
      formatted_address: string;
      geometry: GeocoderGeometry;
      place_id: string;
      types: string[];
    }
    
    interface GeocoderAddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }
    
    interface GeocoderGeometry {
      location: LatLng;
      location_type: GeocoderLocationType;
      viewport: LatLngBounds;
      bounds?: LatLngBounds;
    }
    
    interface LatLng {
      lat(): number;
      lng(): number;
    }
    
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    
    interface LatLngBounds {
      extend(latLng: LatLng | LatLngLiteral): void;
      getCenter(): LatLng;
      contains(latLng: LatLng | LatLngLiteral): boolean;
    }
    
    interface LatLngBoundsLiteral {
      east: number;
      north: number;
      south: number;
      west: number;
    }
    
    interface GeocoderComponentRestrictions {
      country?: string | string[];
      postalCode?: string;
      route?: string;
      locality?: string;
      administrativeArea?: string;
    }
    
    type GeocoderStatus = 
      | 'OK'
      | 'ZERO_RESULTS'
      | 'OVER_QUERY_LIMIT'
      | 'REQUEST_DENIED'
      | 'INVALID_REQUEST'
      | 'UNKNOWN_ERROR';
      
    type GeocoderLocationType = 
      | 'ROOFTOP'
      | 'RANGE_INTERPOLATED'
      | 'GEOMETRIC_CENTER'
      | 'APPROXIMATE';
  }
}

declare global {
  interface Window {
    google: {
      maps: typeof google.maps;
    };
  }
}

export {};

