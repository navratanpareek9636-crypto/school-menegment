# Production Deployment Guide

## 1. Production Architecture & Prerequisites

The **Enterprise School ERP System** is designed for high reliability, minimal resource footprint, and zero fragile external daemon dependencies.

### Minimum Recommended Production Specs
- **CPU**: 2+ vCPU
- **RAM**: 4GB+ ECC RAM
- **Disk**: 40GB+ NVMe SSD (High random I/O performance for SQLite WAL operations)
- **OS**: Ubuntu 22.04/24.04 LTS, Debian 12, or Windows Server 2022
- **Node.js**: `v20.x` or `v24.x` LTS

---

## 2. Server Provisioning & First-Time Setup

### Step 1: Install Node.js LTS
On Ubuntu/Debian:
```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
```

### Step 2: Deploy Project Code
```bash
git clone <repository_url> /var/www/school-erp
cd /var/www/school-erp
npm install --production=false

# Build production React frontend
cd client
npm install
npm run build
cd ..
```

### Step 3: Configure Production Environment (`.env`)
Create `/var/www/school-erp/.env`:
```ini
PORT=5000
NODE_ENV=production
DATABASE_PATH=/var/data/school_erp/school_erp.sqlite
JWT_SECRET=GENERATED_SECURE_64_CHAR_HEX_TOKEN_NEVER_COMMIT
JWT_EXPIRES_IN=12h
BCRYPT_SALT_ROUNDS=12
DEFAULT_SCHOOL_ID=1
PAYMENT_GATEWAY_PROVIDER=razorpay
SMS_PROVIDER=dlt_sms
UDISE_EXPORT_ENABLED=true
```

Ensure secure permissions on `.env` and database folder:
```bash
sudo chmod 600 /var/www/school-erp/.env
sudo mkdir -p /var/data/school_erp
sudo chown -R $USER:$USER /var/data/school_erp
```

---

## 3. Database Initialization & Secure Admin Provisioning

### Run Migrations
```bash
npm run migrate
```

### Secure First-Time Admin Provisioning
Do **never** commit default passwords to production. To securely provision the primary Superadmin or School Admin:
```bash
node -e "
const { getDb, run } = require('./server/config/database');
const { hashPassword } = require('./server/services/authService');
const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });

readline.question('Enter Admin Username (email): ', (username) => {
  readline.question('Enter Secure Admin Password: ', (password) => {
    const { salt, hash } = hashPassword(password);
    run('INSERT INTO users (username, email, password_hash, password_salt, full_name, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, username, hash, salt, 'System Administrator', 'superadmin', 'active']);
    console.log('Admin account provisioned successfully.');
    process.exit(0);
  });
});
"
```

---

## 4. Process Management via PM2

Install PM2 globally:
```bash
sudo npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'school-erp',
    script: './server/index.js',
    instances: 1, // Single instance ensures atomic SQLite transaction coordination
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

Start the application and configure startup daemon:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 5. Reverse Proxy & HTTPS via Nginx

Install Nginx & Certbot:
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Configure `/etc/nginx/sites-available/school-erp`:
```nginx
server {
    server_name erp.yourschool.edu.in;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 25M;
    }
}
```

Enable site and acquire SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/school-erp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d erp.yourschool.edu.in
```

---

## 6. Health Checks & Monitoring

The system exposes a lightweight operational health endpoint:
- **URL**: `https://erp.yourschool.edu.in/api/health`
- **Method**: `GET`
- **Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2026-10-11T12:00:00.000Z",
  "uptimeSeconds": 86400,
  "database": {
    "status": "connected",
    "integrity": "ok"
  },
  "environment": "production"
}
```
Integrate this endpoint with uptime monitoring services (e.g. UptimeKuma, Datadog, Prometheus Blackbox exporter).
