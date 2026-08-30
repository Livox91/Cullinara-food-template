export function addressDto(a: any) {
  return {
    ...a,
    latitude: a.latitude.toString(),
    longitude: a.longitude.toString(),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
export function profileDto(p: any) {
  return {
    id: p.id,
    userId: p.userId,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.user.email,
    phone: p.user.phone,
    emailVerifiedAt: p.user.emailVerifiedAt?.toISOString() ?? null,
    phoneVerifiedAt: p.user.phoneVerifiedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
