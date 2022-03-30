import { PrismaClient } from './generated/prisma';
import { getCurrentHub } from '@sentry/node';

const prisma = new PrismaClient();
prisma.$use(async (params, next) => {
  const before = Date.now();

  const result = await next(params);

  const after = Date.now();

  console.log(
    `Query ${params.model}.${params.action} took ${after - before}ms`
  );

  return result;
});
prisma.$use(async (params, next) => {
  const { model, action, runInTransaction, args } = params;
  const description = [model, action].filter(Boolean).join('.');
  const data = {
    model,
    action,
    runInTransaction,
    args,
  };
  const scope = getCurrentHub().getScope();
  const parentSpan = scope?.getSpan();
  const span = parentSpan?.startChild({
    op: 'db',
    description,
    data,
  });

  // optional but nice
  scope?.addBreadcrumb({
    category: 'db',
    message: description,
    data,
  });

  const result = await next(params);
  span?.finish();

  return result;
});
export default prisma;
