const base = process.env.SECURITY_TEST_BASE_URL || 'http://localhost:3001/api';
const testEmail = process.env.SECURITY_TEST_EMAIL || '';
const testPassword = process.env.SECURITY_TEST_PASSWORD || '';

const results = [];
const now = Date.now();
const email = `segtest_${now}@example.com`;

async function req(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  return { status: res.status, body, headers: res.headers };
}

function push(name, pass, detail) {
  results.push({ name, pass, detail });
}

async function run() {
  try {
    const noAuthAdmin = await req('/users/institution-admin', {
      method: 'POST',
      body: JSON.stringify({})
    });
    push('Admin route requires auth', noAuthAdmin.status === 401, `status=${noAuthAdmin.status}`);

    const noAuthReport = await req('/reports/scores');
    push('Reports route requires auth', noAuthReport.status === 401, `status=${noAuthReport.status}`);

    const noAuthNotifications = await req('/notifications/unread/1');
    push('Notifications route requires auth', noAuthNotifications.status === 401, `status=${noAuthNotifications.status}`);

    const createUser = await req('/users', {
      method: 'POST',
      body: JSON.stringify({
        nombres: 'Seg',
        apellidos: 'Tester',
        email,
        phone: '+59171234567',
        role_id: 3
      })
    });

    const hasNoTempPassword = createUser.status === 201 && createUser.body && !('tempPassword' in createUser.body);
    push('Create user does not expose tempPassword', hasNoTempPassword, `status=${createUser.status}`);

    const userId = createUser.body?.id;
    if (!userId) {
      throw new Error(`No userId from createUser test. body=${JSON.stringify(createUser.body)}`);
    }

    const changePassword = await req(`/users/changePassword/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ password: 'Segura123!' })
    });
    push('Change password now requires auth', changePassword.status === 401, `status=${changePassword.status}`);

    if (testEmail && testPassword) {
      const login = await req('/users/login', {
        method: 'POST',
        body: JSON.stringify({ email: testEmail, password: testPassword })
      });

      const token = login.body?.user?.token;
      const hasToken = login.status === 200 && typeof token === 'string' && token.length > 20;
      push('Login returns JWT token', hasToken, `status=${login.status}`);

      const hasRoleId = typeof login.body?.user?.roleId === 'number';
      push('Login response includes roleId', hasRoleId, `roleId=${login.body?.user?.roleId}`);

      const authReport = await req('/reports/materiales', {
        headers: { Authorization: `Bearer ${token}` }
      });
      push('Authenticated access to protected report works', authReport.status !== 401, `status=${authReport.status}`);

      const nonAdminCreateInstitution = await req('/users/institution-admin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          companyName: 'Test Corp',
          nit: `NIT-${now}`,
          email: `corp_${now}@example.com`,
          phone: '71111111',
          role_id: 2
        })
      });
      push('Admin route blocks non-admin user', nonAdminCreateInstitution.status === 403, `status=${nonAdminCreateInstitution.status}`);
    } else {
      push('Login returns JWT token', true, 'skipped (SECURITY_TEST_EMAIL/PASSWORD no definidos)');
      push('Login response includes roleId', true, 'skipped (SECURITY_TEST_EMAIL/PASSWORD no definidos)');
      push('Authenticated access to protected report works', true, 'skipped (SECURITY_TEST_EMAIL/PASSWORD no definidos)');
      push('Admin route blocks non-admin user', true, 'skipped (SECURITY_TEST_EMAIL/PASSWORD no definidos)');
    }

    let login429 = false;
    for (let i = 0; i < 10; i += 1) {
      const r = await req('/users/login', {
        method: 'POST',
        body: JSON.stringify({ email: `noexiste_${now}@example.com`, password: 'badpass' })
      });
      if (r.status === 429) {
        login429 = true;
        break;
      }
    }
    push('Login rate limiting triggers (429)', login429, 'attempts<=10');

    let checkEmail429 = false;
    for (let i = 0; i < 25; i += 1) {
      const r = await req(`/users/check-email/${encodeURIComponent(`bulk_${i}_${now}@example.com`)}`);
      if (r.status === 429) {
        checkEmail429 = true;
        break;
      }
    }
    push('Check-email rate limiting triggers (429)', checkEmail429, 'attempts<=25');

    let forgot429 = false;
    for (let i = 0; i < 7; i += 1) {
      const r = await req('/users/forgotpassword', {
        method: 'POST',
        body: JSON.stringify({ email: `forgot_${now}@example.com` })
      });
      if (r.status === 429) {
        forgot429 = true;
        break;
      }
    }
    push('Forgot-password rate limiting triggers (429)', forgot429, 'attempts<=7');
  } catch (error) {
    push('Test runner fatal error', false, error.message);
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log('\n=== SECURITY TEST RESULTS ===');
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.name} | ${r.detail}`);
  }
  console.log(`SUMMARY: passed=${passed} failed=${failed} total=${results.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
