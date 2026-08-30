import type { User } from "../../../../generated/prisma/client";
import type { AuthUserDto } from "@/server/modules/auth/auth.types";

interface UserWithCustomerProfile extends User {
  customerProfile: { firstName: string | null; lastName: string | null } | null;
}

export function toAuthUserDto(user: UserWithCustomerProfile): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? null,
    firstName: user.customerProfile?.firstName ?? null,
    lastName: user.customerProfile?.lastName ?? null,
  };
}
