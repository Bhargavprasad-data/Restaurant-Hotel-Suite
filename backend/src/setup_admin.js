const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
  const email = 'bhargavvana80@gmail.com';
  const rawPassword = 'Bhargav11@prasad';
  const name = 'Hotel Admin';
  const role = 'admin';

  console.log(`🔐 Starting administrator credentials configuration...`);
  console.log(`👤 Target Email: ${email}`);

  try {
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Check if the user already exists in the database
    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    let resultUser;
    if (checkUser.rows.length > 0) {
      console.log('📝 Existing user found. Updating account details...');
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, role = $2, is_verified = TRUE, name = $3
        WHERE email = $4
        RETURNING id, name, email, role, is_verified
      `;
      const res = await db.query(updateQuery, [passwordHash, role, name, email]);
      resultUser = res.rows[0];
      console.log('✅ Admin credentials updated successfully!');
    } else {
      console.log('🆕 No user found with this email. Creating new administrator account...');
      const insertQuery = `
        INSERT INTO users (name, email, password_hash, role, phone_number, is_verified)
        VALUES ($1, $2, $3, $4, '9999999999', TRUE)
        RETURNING id, name, email, role, is_verified
      `;
      const res = await db.query(insertQuery, [name, email, passwordHash, role]);
      resultUser = res.rows[0];
      console.log('✅ Admin credentials created successfully!');
    }

    console.log('\n🌟 CONFIGURED ADMIN RECORD DETAILS:');
    console.log(JSON.stringify(resultUser, null, 2));
    console.log('\nYou can now log in to the Hotel Admin Console (http://localhost:5181) using these credentials.');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to configure administrator account:', err.message);
    process.exit(1);
  }
}

setupAdmin();
