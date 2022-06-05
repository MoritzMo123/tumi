import { builder } from '../../builder';
import prisma from '../../client';
import { Role, MembershipStatus, PurchaseStatus } from '../../generated/prisma';

builder.queryFields((t) => ({
  users: t.prismaField({
    authScopes: {
      admin: true,
    },
    type: ['User'],
    args: {
      roleList: t.arg({ type: [Role], defaultValue: Object.values(Role) }),
      statusList: t.arg({
        type: [MembershipStatus],
        defaultValue: Object.values(MembershipStatus),
      }),
      search: t.arg.string(),
      pageIndex: t.arg.int(),
      pageLength: t.arg.int(),
      onlyWithPurchase: t.arg.boolean(),
    },
    resolve: async (
      query,
      root,
      { statusList, roleList, search, pageLength, pageIndex, onlyWithPurchase },
      context,
      info
    ) => {
      const OR: any[] = [];
      let page = {};
      if (typeof pageIndex === 'number' && typeof pageLength === 'number') {
        page = { skip: pageIndex * pageLength, take: pageLength };
      }
      if (search) {
        OR.push({ firstName: { search } });
        OR.push({ lastName: { search } });
        OR.push({ email: { search } });
      }
      return prisma.user.findMany({
        ...query,
        where: {
          ...(search ? { OR } : {}),
          ...(onlyWithPurchase
            ? {
                purchases: {
                  some: { status: { not: PurchaseStatus.CANCELLED } },
                },
              }
            : {}),
          tenants: {
            some: {
              tenantId: context.tenant.id,
              // @ts-ignore
              role: { in: roleList ?? [] },
              // @ts-ignore
              status: { in: statusList ?? [] },
            },
          },
        },
        orderBy: { lastName: 'asc' },
        ...page,
      });
    },
  }),
  userSearchResultNum: t.int({
    args: {
      roleList: t.arg({ type: [Role], defaultValue: Object.values(Role) }),
      statusList: t.arg({
        type: [MembershipStatus],
        defaultValue: Object.values(MembershipStatus),
      }),
      search: t.arg.string(),
    },
    resolve: async (
      query,
      root,
      { statusList, roleList, search },
      context,
      info
    ) => {
      const OR: any[] = [];
      if (search) {
        OR.push({ firstName: { search } });
        OR.push({ lastName: { search } });
        OR.push({ email: { search } });
      }
      return prisma.user.count({
        where: {
          ...(search ? { OR } : {}),
          tenants: {
            some: {
              tenantId: context.tenant.id,
              // @ts-ignore
              role: { in: roleList },
              // @ts-ignore
              status: { in: statusList },
            },
          },
        },
      });
    },
  }),
  user: t.prismaField({
    type: 'User',
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (query, root, args, ctx, info) =>
      prisma.user.findUnique({ ...query, where: { id: args.id } }),
  }),
}));