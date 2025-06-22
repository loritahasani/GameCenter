# Gjeniu i vogël - Render.com Deployment Guide

## 🚀 Overview
Ky guide do t'ju tregojë si ta hostoni "Gjeniu i vogël" në Render.com, një platformë moderne dhe e lehtë për t'u përdorur.

## 📋 Prerequisites
- GitHub account
- Render.com account (falas)
- MongoDB Atlas account (falas)
- Gmail account për SMTP

## 🗄️ Step 1: MongoDB Atlas Setup

### 1.1 Krijo MongoDB Cluster
1. Shko në [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Krijo account falas
3. Krijo një cluster (M0 - Free tier)
4. Zgjidh cloud provider (AWS, Google Cloud, ose Azure)
5. Zgjidh region (preferohet më afër Europës)

### 1.2 Konfiguro Database
1. Krijo database user:
   - Username: `gjeniu_user`
   - Password: `gjeniu_password_2024` (ose diçka e sigurt)
   - Role: `Read and write to any database`

2. Whitelist IP addresses:
   - Kliko "Network Access"
   - "Add IP Address"
   - "Allow Access from Anywhere" (0.0.0.0/0)

3. Kopjo connection string:
   ```
   mongodb+srv://gjeniu_user:gjeniu_password_2024@cluster0.xxxxx.mongodb.net/gjeniu-i-vogel?retryWrites=true&w=majority
   ```

## 📧 Step 2: Gmail SMTP Setup

### 2.1 Konfiguro Gmail App Password
1. Shko në [myaccount.google.com](https://myaccount.google.com)
2. Security > 2-Step Verification (aktivizo nëse nuk është)
3. Security > App passwords
4. Krijo app password për "Gjeniu i vogël"
5. Kopjo password-in (16 karaktere)

## 🌐 Step 3: Render.com Setup

### 3.1 Krijo Account
1. Shko në [render.com](https://render.com)
2. Sign up me GitHub
3. Verifiko email-in

### 3.2 Deploy Backend

#### 3.2.1 Krijo Web Service
1. Kliko "New" > "Web Service"
2. Lidh GitHub repository
3. Konfiguro:
   - **Name**: `gjeniu-i-vogel-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `chmod +x build.sh && ./build.sh`
   - **Start Command**: `chmod +x start.sh && ./start.sh`
   - **Plan**: `Free`

#### 3.2.2 Konfiguro Environment Variables
Kliko "Environment" dhe shto:

```bash
MONGODB_URI=mongodb+srv://gjeniu_user:gjeniu_password_2024@cluster0.xxxxx.mongodb.net/gjeniu-i-vogel?retryWrites=true&w=majority
SECRET_KEY=gjeniu-secret-key-2024-super-secure
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-16-char-app-password
MAIL_DEFAULT_SENDER=your-email@gmail.com
```

#### 3.2.3 Deploy
1. Kliko "Create Web Service"
2. Prisni deployment (2-5 minuta)
3. Kopjo URL-n: `https://gjeniu-i-vogel-backend.onrender.com`

### 3.3 Deploy Frontend

#### 3.3.1 Krijo Static Site
1. Kliko "New" > "Static Site"
2. Lidh GitHub repository
3. Konfiguro:
   - **Name**: `gjeniu-i-vogel-frontend`
   - **Build Command**: `echo "No build needed"`
   - **Publish Directory**: `frontend`
   - **Plan**: `Free`

#### 3.3.2 Deploy
1. Kliko "Create Static Site"
2. Prisni deployment (1-2 minuta)
3. Kopjo URL-n: `https://gjeniu-i-vogel-frontend.onrender.com`

## 🔧 Step 4: Update Frontend URLs

### 4.1 Update API URLs
Në `frontend/assets/js/auth.js`, ndrysho:
```javascript
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : 'https://gjeniu-i-vogel-backend.onrender.com/api';
```

### 4.2 Update CORS në Backend
Në `backend/app.py`, shto domain-in e frontend:
```python
CORS(app, origins=[
    "http://localhost:3000",
    "http://localhost:8000", 
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "https://gjeniu-i-vogel-backend.onrender.com",
    "https://gjeniu-i-vogel-frontend.onrender.com"
])
```

## 🧪 Step 5: Test Deployment

### 5.1 Test Backend
```bash
curl https://gjeniu-i-vogel-backend.onrender.com/api/test
```
Duhet të kthejë: `{"message": "Server and MongoDB are working!"}`

### 5.2 Test Frontend
1. Hap `https://gjeniu-i-vogel-frontend.onrender.com`
2. Testo regjistrimin e përdoruesit
3. Testo login-in
4. Testo lojërat

## 🔍 Troubleshooting

### Common Issues:

#### 1. **CORS Errors**
- Kontrollo që domain-et janë të saktë në `backend/app.py`
- Kontrollo që API_BASE_URL është i saktë në frontend

#### 2. **MongoDB Connection Failed**
- Kontrollo MONGODB_URI në environment variables
- Kontrollo që IP whitelist është 0.0.0.0/0
- Kontrollo username/password

#### 3. **Email Not Sending**
- Kontrollo Gmail app password
- Kontrollo që 2-Step Verification është aktivizuar
- Kontrollo MAIL_USERNAME dhe MAIL_PASSWORD

#### 4. **Build Failed**
- Kontrollo që `requirements.txt` ekziston
- Kontrollo që `build.sh` dhe `start.sh` janë executable
- Kontrollo logs në Render dashboard

### Debug Commands:
```bash
# Check backend logs
# Në Render dashboard > gjeniu-i-vogel-backend > Logs

# Check frontend logs  
# Në Render dashboard > gjeniu-i-vogel-frontend > Logs
```

## 💰 Cost Breakdown

### Free Tier (Recommended):
- **Backend**: $0/month (sleeps after 15 min inactivity)
- **Frontend**: $0/month (unlimited)
- **MongoDB Atlas**: $0/month (512MB storage)
- **Total**: $0/month

### Paid Plans:
- **Backend**: $7/month (always on)
- **Frontend**: $0/month (unlimited)
- **MongoDB Atlas**: $9/month (2GB storage)
- **Total**: $16/month

## 🔒 Security Best Practices

1. **Environment Variables**: Asnjëherë mos i commit API keys
2. **HTTPS**: Render automatik SSL
3. **CORS**: Konfiguro vetëm domain-et e nevojshme
4. **MongoDB**: Përdor strong passwords
5. **Gmail**: Përdor app passwords, jo account password

## 📈 Monitoring

### Render Dashboard:
- **Uptime**: Automatik monitoring
- **Logs**: Real-time logs
- **Metrics**: CPU, memory usage
- **Alerts**: Email notifications

### Custom Monitoring:
```bash
# Health check endpoint
curl https://gjeniu-i-vogel-backend.onrender.com/api/test

# Check response time
curl -w "@curl-format.txt" https://gjeniu-i-vogel-backend.onrender.com/api/test
```

## 🚀 Next Steps

Pasi të jetë deployed:
1. **Test të gjitha funksionalitetet**
2. **Setup custom domain** (opsional)
3. **Configure monitoring alerts**
4. **Setup automated backups**
5. **Implement analytics**
6. **Add error tracking**

## 📞 Support

Nëse keni probleme:
1. Kontrollo Render logs
2. Kontrollo MongoDB Atlas logs
3. Test në local environment
4. Kontrollo environment variables
5. Kontrollo network connectivity

## 🎉 Success!

Pasi të ndiqni këtë guide, "Gjeniu i vogël" do të jetë online në:
- **Frontend**: `https://gjeniu-i-vogel-frontend.onrender.com`
- **Backend**: `https://gjeniu-i-vogel-backend.onrender.com`

Aplikacioni do të jetë i disponueshëm për të gjithë nxënësit dhe mësuesit! 