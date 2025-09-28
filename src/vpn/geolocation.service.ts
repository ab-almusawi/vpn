import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface LocationData {
  country: string;
  city: string;
}

@Injectable()
export class GeolocationService {
  constructor(private configService: ConfigService) {}

  async getLocationByIp(ip: string): Promise<LocationData> {
    if (this.isPrivateIp(ip) || ip === '127.0.0.1') {
      return {
        country: 'Unknown',
        city: 'Unknown',
      };
    }

    try {
      const location = await this.fetchLocationFromApi(ip);
      return location;
    } catch (error) {
      console.warn(`Failed to get location for IP ${ip}:`, error.message);
      return {
        country: 'Unknown',
        city: 'Unknown',
      };
    }
  }

  private async fetchLocationFromApi(ip: string): Promise<LocationData> {
    const apiKey = this.configService.get('IP_GEOLOCATION_API_KEY');
    
    if (apiKey) {
      return await this.fetchFromIpGeolocationApi(ip, apiKey);
    } else {
      return await this.fetchFromFreeApi(ip);
    }
  }

  private async fetchFromIpGeolocationApi(ip: string, apiKey: string): Promise<LocationData> {
    try {
      const response = await axios.get(
        `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}`,
        { timeout: 5000 }
      );

      return {
        country: response.data.country_name || 'Unknown',
        city: response.data.city || 'Unknown',
      };
    } catch (error) {
      throw new Error(`IP Geolocation API error: ${error.message}`);
    }
  }

  private async fetchFromFreeApi(ip: string): Promise<LocationData> {
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`, {
        timeout: 5000,
      });

      if (response.data.status === 'success') {
        return {
          country: response.data.country || 'Unknown',
          city: response.data.city || 'Unknown',
        };
      } else {
        throw new Error('Free API returned error status');
      }
    } catch (error) {
      try {
        const fallbackResponse = await axios.get(
          `https://ipapi.co/${ip}/json/`,
          { timeout: 5000 }
        );

        return {
          country: fallbackResponse.data.country_name || 'Unknown',
          city: fallbackResponse.data.city || 'Unknown',
        };
      } catch (fallbackError) {
        throw new Error(`All geolocation APIs failed: ${fallbackError.message}`);
      }
    }
  }

  private isPrivateIp(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^fc00:/,
      /^fe80:/,
    ];

    return privateRanges.some(range => range.test(ip));
  }
}
