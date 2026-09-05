import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx tsx scripts/promote-admin.ts <email>');
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' },
  });

  console.log(`${user.email} is now ADMIN.`);
}

main()
  .catch((error) => {
    if (error.code === 'P2025') {
      console.error('No user found with that email.');
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());