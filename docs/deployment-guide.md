# 🚀 Cloud Deployment Guide — LoanFlex

Follow this step-by-step guide to deploy the entire **LoanFlex** application to the cloud for FREE using **MongoDB Atlas**, **Render**, and **Vercel**.

---

## Step 1: Set Up Cloud Database (MongoDB Atlas)

1. Sign up for a free account at **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas)**.
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a database user (e.g. `loanflex_admin` with password).
4. Under **Network Access**, click **Add IP Address** → Select **Allow Access from Anywhere** (`0.0.0.0/0`).
5. Click **Connect** → **Drivers** → Copy your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/loan-emi-system?retryWrites=true&w=majority
   ```

---

## Step 2: Deploy Backend Server to Render (Free Tier)

1. Sign up at **[Render.com](https://render.com)**.
2. Click **New +** → **Web Service** → Connect your GitHub repository (`divyal-11/loan-emi-system`).
3. Set the following settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGODB_URI`: `<Your MongoDB Atlas Connection String from Step 1>`
   - `JWT_SECRET`: `<A random secret string minimum 32 chars>`
   - `JWT_EXPIRES_IN`: `7d`
5. Click **Create Web Service**.
6. Once deployed, copy your public API URL (e.g. `https://loanflex-api.onrender.com`).

---

## Step 3: Seed Cloud Database (Optional)

To seed your cloud MongoDB database with sample test accounts (`asha@example.com`, `admin@example.com`):

On your local machine, run:
```bash
MONGODB_URI="your-atlas-connection-string" npm run seed
```

---

## Step 4: Deploy Frontend Client to Vercel (Free Tier)

1. Sign up at **[Vercel.com](https://vercel.com)**.
2. Click **Add New...** → **Project** → Import your GitHub repository (`divyal-11/loan-emi-system`).
3. Set the following settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `client`
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_BASE_URL`: `https://loanflex-api.onrender.com/api` *(Your Render URL from Step 2)*
5. Click **Deploy**.

---

## 🎉 Done!

Your full-stack application is now live on the internet with public URLs you can add to your resume:
- **Live Frontend**: `https://loanflex.vercel.app`
- **Live Backend API**: `https://loanflex-api.onrender.com/api`
