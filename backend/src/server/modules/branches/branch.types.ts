export interface BranchDto {
  id: string;
  businessId: string;
  code: string;
  name: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string | null;
  postalCode: string | null;
  latitude: string;
  longitude: string;
  isActive: boolean;
  isAcceptingOrders: boolean;
  minimumOrderAmount: string;
  deliveryRadiusKm: string | null;
  defaultPrepMinutes: number;
  timezone: string;
  isOpenNow: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchHoursDto {
  branchId: string;
  timezone: string;
  isOpenNow: boolean;
  weekly: Array<{
    dayOfWeek: number;
    intervals: Array<{ opensAt: string; closesAt: string }>;
  }>;
  special: Array<{
    date: string;
    isClosed: boolean;
    opensAt: string | null;
    closesAt: string | null;
    note: string | null;
  }>;
}
