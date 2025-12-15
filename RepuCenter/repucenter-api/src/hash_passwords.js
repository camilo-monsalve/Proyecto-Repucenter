const bcrypt = require('bcrypt');

async function run() {
  const items = [
    { user: 'jefe_bodega', pass: 'Secreta#2025', role: 'JEFE_BODEGA' },
    { user: 'operador1',  pass: 'ClaveOp#2025',  role: 'OPERADOR' },
  ];

  for (const it of items) {
    const hash = await bcrypt.hash(it.pass, 10);
    console.log(
      `INSERT INTO app_user (username, password_hash, user_role) VALUES ('${it.user}', '${hash}', '${it.role}');`
    );
  }
}
run();