import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ProvinceDto, CommuneDto, DistrictDto, WardDto } from './dto/province.dto';
import { ReverseGeocodeDto, ReverseGeocodeResponseDto } from './dto/reverse-geocode.dto';

@Injectable()
export class AddressService {
    private readonly logger = new Logger(AddressService.name);
    private readonly NSO_API = 'https://production.cas.so/address-kit';
    private readonly NOMINATIM_API = 'https://nominatim.openstreetmap.org';
    private readonly DEFAULT_EFFECTIVE_DATE = 'latest';

    constructor(private httpService: HttpService) { }

    /**
     * Get all provinces/cities in Vietnam (NSO/CASSO API)
     * @param effectiveDate - Date for administrative data (default: 'latest')
     */
    async getProvinces(effectiveDate: string = this.DEFAULT_EFFECTIVE_DATE): Promise<ProvinceDto[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.NSO_API}/${effectiveDate}/provinces`)
            );
            return response.data.provinces || [];
        } catch (error) {
            this.logger.error(`Failed to fetch provinces: ${error.message}`);
            throw new BadRequestException('Không thể lấy danh sách tỉnh/thành phố');
        }
    }

    /**
     * @deprecated Districts no longer exist in new 2-tier structure (Province → Commune)
     * Returns empty array for backwards compatibility
     */
    async getDistrictsByProvince(provinceCode: number): Promise<DistrictDto[]> {
        this.logger.warn('getDistrictsByProvince is deprecated - districts removed in new administrative structure');
        return [];
    }

    /**
     * @deprecated Use getCommunesByProvince instead
     * Returns empty array for backwards compatibility
     */
    async getWardsByDistrict(districtCode: number): Promise<WardDto[]> {
        this.logger.warn('getWardsByDistrict is deprecated - use getCommunesByProvince instead');
        return [];
    }

    /**
     * Get all communes by province code (Province → Commune structure)
     * Uses new NSO/CASSO API with 2-tier administrative system
     */
    async getCommunesByProvince(provinceCode: string, effectiveDate: string = this.DEFAULT_EFFECTIVE_DATE): Promise<CommuneDto[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.NSO_API}/${effectiveDate}/provinces/${provinceCode}/communes`)
            );

            const communes = response.data.communes || [];
            this.logger.log(`Found ${communes.length} communes for province ${provinceCode}`);
            return communes;
        } catch (error) {
            this.logger.error(`Failed to fetch communes for province ${provinceCode}: ${error.message}`);
            throw new BadRequestException('Không thể lấy danh sách xã/phường');
        }
    }

    /**
     * Legacy method - kept for backwards compatibility
     * @deprecated Use getCommunesByProvince instead
     */
    async getWardsByProvince(provinceCode: string): Promise<CommuneDto[]> {
        return this.getCommunesByProvince(provinceCode);
    }

    /**
     * Reverse geocoding: Convert coordinates to address
     * Using Nominatim (OpenStreetMap) - Free API
     */
    async reverseGeocode(dto: ReverseGeocodeDto): Promise<ReverseGeocodeResponseDto> {
        try {
            this.logger.log(`🌍 Reverse geocoding: ${dto.latitude}, ${dto.longitude}`);

            const response = await firstValueFrom(
                this.httpService.get(`${this.NOMINATIM_API}/reverse`, {
                    params: {
                        lat: dto.latitude,
                        lon: dto.longitude,
                        format: 'json',
                        addressdetails: 1,
                        'accept-language': 'vi',
                    },
                    headers: {
                        'User-Agent': 'KLTNEcommerce/1.0', // Required by Nominatim
                    },
                })
            );

            const data = response.data;
            const address = data.address || {};

            // Extract Vietnamese address components
            const result: ReverseGeocodeResponseDto = {
                province: this.extractProvince(address),
                district: address.county || address.city_district || address.suburb || null,
                ward: address.quarter || address.neighbourhood || address.hamlet || null,
                street_address: this.buildStreetAddress(address),
                display_name: data.display_name || '',
            };

            this.logger.log(`✅ Geocoded: ${result.province}, ${result.district}, ${result.ward}`);
            return result;
        } catch (error) {
            this.logger.error(`Reverse geocoding failed: ${error.message}`);
            throw new BadRequestException('Không thể chuyển đổi tọa độ thành địa chỉ');
        }
    }

    /**
     * Extract province/city from Nominatim response
     */
    private extractProvince(address: any): string {
        return (
            address.province ||
            address.state ||
            address.city ||
            address.town ||
            'Việt Nam'
        );
    }

    /**
     * Build street address from components
     */
    private buildStreetAddress(address: any): string {
        const parts = [
            address.house_number,
            address.road,
            address.street,
        ].filter(Boolean);

        return parts.join(', ') || null;
    }

    /**
     * Search address by query (optional - for autocomplete)
     */
    async searchAddress(query: string): Promise<any[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.NOMINATIM_API}/search`, {
                    params: {
                        q: query,
                        format: 'json',
                        addressdetails: 1,
                        'accept-language': 'vi',
                        countrycodes: 'vn', // Vietnam only
                        limit: 5,
                    },
                    headers: {
                        'User-Agent': 'KLTNEcommerce/1.0',
                    },
                })
            );

            return response.data;
        } catch (error) {
            this.logger.error(`Address search failed: ${error.message}`);
            return [];
        }
    }
}
