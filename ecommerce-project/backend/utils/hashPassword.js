// Run with: npm run hash -- MyPassword123
// Prints a bcrypt hash you can paste into the Users.PasswordHash column.
const bcrypt = require('bcryptjs');

const plain = process.argv[2];
if (!plain) {
  console.log('Usage: node utils/hashPassword.js <plainTextPassword>');
  process.exit(1);
}

bcrypt.hash(plain, 10).then(hash => {
  console.log('\nBcrypt hash:\n' + hash + '\n');
});
