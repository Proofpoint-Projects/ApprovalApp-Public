import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      displayName: 'Portal Admin',
      role: UserRole.ADMIN,
      externalId: 'entra-admin-demo'
    }
  });

  await prisma.user.upsert({
    where: { email: 'approver@example.com' },
    update: {},
    create: {
      email: 'approver@example.com',
      displayName: 'Portal Approver',
      role: UserRole.APPROVER,
      externalId: 'entra-approver-demo'
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
