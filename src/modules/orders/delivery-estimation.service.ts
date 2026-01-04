import { Injectable } from '@nestjs/common';

interface DeliveryEstimate {
  from: string;
  to: string;
  date: string;
  formatted: string;
}

@Injectable()
export class DeliveryEstimationService {
  private readonly MAJOR_CITIES = [
    'Ho Chi Minh City',
    'Ho Chi Minh',
    'HCMC',
    'Thành phố Hồ Chí Minh',
    'Hanoi',
    'Hà Nội',
    'Da Nang',
    'Đà Nẵng',
  ];

  isMajorCity(city: string): boolean {
    if (!city) return false;
    const normalizedCity = city.toLowerCase().trim();
    return this.MAJOR_CITIES.some(majorCity => normalizedCity.includes(majorCity.toLowerCase()));
  }

  estimateDeliveryDate(
    orderDate: Date,
    shippingMethod: string,
    location: { city: string; district: string },
  ): DeliveryEstimate {
    const isMajorCity = this.isMajorCity(location.city);
    let minDays: number;
    let maxDays: number;

    switch (shippingMethod) {
      case 'express':
        minDays = 1;
        maxDays = isMajorCity ? 1 : 2;
        break;

      case 'next_day':
        const orderHour = orderDate.getHours();
        minDays = orderHour < 14 ? 1 : 2;
        maxDays = minDays;
        break;

      case 'standard':
      default:
        if (isMajorCity) {
          minDays = 1;
          maxDays = 2;
        } else {
          minDays = 3;
          maxDays = 5;
        }
        break;
    }

    const fromDate = this.addBusinessDays(orderDate, minDays);
    const toDate = this.addBusinessDays(orderDate, maxDays);
    const estimatedDate = this.addBusinessDays(orderDate, Math.ceil((minDays + maxDays) / 2));

    return {
      from: this.formatDateISO(fromDate),
      to: this.formatDateISO(toDate),
      date: this.formatDateISO(estimatedDate),
      formatted: this.formatDateLong(estimatedDate),
    };
  }

  private addBusinessDays(startDate: Date, daysToAdd: number): Date {
    const currentDate = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < daysToAdd) {
      currentDate.setDate(currentDate.getDate() + 1);

      if (currentDate.getDay() !== 0) {
        daysAdded++;
      }
    }

    return currentDate;
  }

  private formatDateISO(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatDateLong(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getDeliveryStatusMessage(status: string): string {
    const messages = {
      pending:
        'Your order is pending confirmation. Delivery date will be available once confirmed.',
      confirmed:
        'Your order is confirmed and being prepared. Delivery estimate will be available once shipped.',
      processing: 'Your order is being prepared for shipment.',
      shipping: 'Your order is on the way.',
      shipped: 'Your order is on the way.',
      delivered: 'Your order has been delivered.',
      cancelled: 'This order has been cancelled.',
    };

    return messages[status] || 'Order status update pending.';
  }
}
