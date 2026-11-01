import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

export type AdminAuditAction =
  | 'DESTINATION_CREATED'
  | 'DESTINATION_UPDATED'
  | 'DESTINATION_DELETED'
  | 'REVIEW_DELETED'
  | 'ADMIN_ADDED'
  | 'ADMIN_REMOVED';

export async function createAdminAuditLog(
  transaction: Prisma.TransactionClient,
  actorId: string,
  action: AdminAuditAction,
  entityId: string,
  entityLabel: string,
  targetLabel?: string,
) {
  const actor = await transaction.user.findUniqueOrThrow({
    where: { id: actorId },
    select: { name: true, email: true },
  });

  return transaction.adminAuditLog.create({
    data: {
      actorId,
      actorName: actor.name,
      actorEmail: actor.email,
      action,
      entityId,
      entityLabel,
      targetLabel,
    },
  });
}

export async function listAdminAuditLogs(cursor?: string) {
  return prisma.adminAuditLog.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 100,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

export function getDestinationAuditLabel(slug: string, translations: Prisma.JsonValue) {
  if (translations && typeof translations === 'object' && !Array.isArray(translations)) {
    const records = Object.values(translations);
    for (const locale of ['en', 'sk']) {
      const translation = translations[locale];
      if (translation && typeof translation === 'object' && !Array.isArray(translation)) {
        const name = translation.name;
        if (typeof name === 'string') return name;
      }
    }

    for (const translation of records) {
      if (translation && typeof translation === 'object' && !Array.isArray(translation)) {
        const name = translation.name;
        if (typeof name === 'string') return name;
      }
    }
  }
  return slug;
}
