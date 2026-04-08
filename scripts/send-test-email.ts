import "dotenv/config";
import { sendTestEmail } from "../src/lib/email";

async function main() {
  const recipient = process.argv[2]?.trim();

  if (!recipient) {
    throw new Error("Usage: npm run email:test -- you@example.com");
  }

  await sendTestEmail(recipient);
  console.log(`Test email sent to ${recipient}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
