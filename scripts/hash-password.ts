import { hash } from "bcryptjs";

async function main() {
  const password = process.argv[2];

  if (!password) {
    console.error('Usage: npm run admin:hash-password -- "your-password"');
    process.exit(1);
  }

  const passwordHash = await hash(password, 10);
  console.log(passwordHash);
}

main().catch((error) => {
  console.error("Failed to hash password:", error);
  process.exit(1);
});
