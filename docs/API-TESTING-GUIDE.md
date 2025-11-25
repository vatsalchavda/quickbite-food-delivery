# API Documentation & Testing - Quick Reference

## ✅ What's Been Created

### 1. Swagger/OpenAPI Documentation
**URL:** http://localhost:3001/api-docs

**Features:**
- Interactive API documentation
- Try endpoints directly from browser
- Auto-generated from code annotations
- Will expand as we add more services

**Access:** Simply visit the URL when User Service is running

### 2. Postman Collection
**Location:** `postman/QuickBite-API-Collection.json`

**Contents:**
- All User Service endpoints (Register, Login, Profile)
- Auto-saves JWT tokens after login
- Placeholder folders for future services
- Test scripts included

### 3. Postman Environment
**Location:** `postman/QuickBite-Dev-Environment.json`

**Variables:**
- `base_url`: http://localhost:3001
- `auth_token`: Auto-populated after login
- `user_id`: Auto-populated after login
- Ready for additional services

---

## 📥 How to Import into Postman

### Method 1: Import from Files (Recommended)

1. **Open Postman** (Desktop app or Web)

2. **Click Import** button (top left corner)

3. **Drag & Drop these files:**
   - `postman/QuickBite-API-Collection.json`
   - `postman/QuickBite-Dev-Environment.json`

4. **Click Import**

5. **Select Environment:**
   - Top-right dropdown
   - Choose "QuickBite - Development"

### Method 2: Import from GitHub (After you push)

1. **Open Postman**

2. **Click Import** → **Link** tab

3. **Paste raw GitHub URL:**
   ```
   https://raw.githubusercontent.com/vatsalchavda/quickbite-food-delivery/main/postman/QuickBite-API-Collection.json
   ```

4. **Click Continue** → **Import**

5. **Repeat for environment file:**
   ```
   https://raw.githubusercontent.com/vatsalchavda/quickbite-food-delivery/main/postman/QuickBite-Dev-Environment.json
   ```

---

## 🧪 Testing Your APIs

### Using Swagger UI

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **Open Swagger:**
   - Visit: http://localhost:3001/api-docs
   - You'll see all endpoints listed

3. **Try an endpoint:**
   - Click on `/api/auth/register`
   - Click **Try it out**
   - Edit the request body
   - Click **Execute**
   - See the response below!

4. **Test protected endpoints:**
   - First, register/login to get a token
   - Click **Authorize** (top right)
   - Paste your token: `Bearer <your-token-here>`
   - Now you can test `/api/auth/profile`

### Using Postman

1. **Import collection** (see above)

2. **Select environment** (top right)

3. **Test workflow:**
   - Open **User Service** → **Authentication** → **Register User**
   - Click **Send**
   - Token is automatically saved! ✨
   - Go to **User Profile** → **Get Profile**
   - Click **Send** (uses saved token automatically)

4. **View environment variables:**
   - Click the eye icon (top right)
   - See `auth_token` and `user_id` populated

---

## 📋 Available Endpoints

### User Service (Port 3001)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | ❌ | Health check |
| `/api/auth/register` | POST | ❌ | Register new user |
| `/api/auth/login` | POST | ❌ | Login user |
| `/api/auth/profile` | GET | ✅ | Get user profile |
| `/api/auth/profile` | PUT | ✅ | Update profile |

### Coming Soon
- Restaurant Service (Port 3002) - DAY 2
- Order Service (Port 3003) - DAY 3
- API Gateway (Port 3000) - DAY 4
- Driver Service (Port 3004) - DAY 5
- Notification Service (Port 3005) - DAY 5

---

## 🔐 Authentication Flow

### In Postman (Automatic!)

1. **Register or Login**
   - Send request
   - Token automatically saved to environment
   - User ID automatically saved

2. **Use Protected Endpoints**
   - Just send the request
   - Token is automatically included in headers
   - No manual copying needed!

### In Swagger UI (Manual)

1. **Get a token:**
   - Use `/api/auth/login` endpoint
   - Copy the `token` from response

2. **Authorize:**
   - Click **Authorize** button (top right)
   - Enter: `Bearer <paste-token-here>`
   - Click **Authorize**

3. **Test protected endpoints:**
   - Now `/api/auth/profile` will work!

---

## 💡 Pro Tips

### Postman Collections

**Organize by Environment:**
- Development: `http://localhost:3001`
- Production: Your deployed URL

**Use Collection Variables:**
- Already set up for you!
- `{{base_url}}` instead of hardcoding URLs

**Test Scripts:**
- Auto-save tokens after login ✅
- Validate status codes ✅
- Extract IDs for chaining requests ✅

### Swagger Documentation

**Best Practices:**
- Use Swagger UI for quick testing
- Use Postman for workflow testing
- Both stay in sync as code changes

**Interview Talking Points:**
- "I documented APIs using OpenAPI/Swagger specification"
- "Auto-generated docs from code annotations"
- "Team can test endpoints without Postman"

---

## 🔄 Updating Documentation

### When You Add New Endpoints

**Swagger:** Automatically updates!
- Just add JSDoc comments in routes
- Rebuild service: `docker-compose up -d --build quickbite-user-service`
- Refresh browser

**Postman:**
1. Add requests in Postman UI
2. Export collection:
   - Right-click collection
   - **Export** → Choose v2.1
   - Save to `postman/QuickBite-API-Collection.json`
3. Commit and push

---

## 📤 Exporting from Postman

### Export Collection

1. Right-click **QuickBite Food Delivery** collection
2. Click **Export**
3. Choose **Collection v2.1** (recommended)
4. Save to `postman/QuickBite-API-Collection.json`
5. Commit to Git

### Export Environment

1. Click **Environments** (left sidebar)
2. Click **⋯** next to **QuickBite - Development**
3. Click **Export**
4. Save to `postman/QuickBite-Dev-Environment.json`
5. Commit to Git

### Share with Team

**Option 1: Git Repository**
```bash
git add postman/
git commit -m "docs: update API collection"
git push
```

**Option 2: Postman Workspace**
- Create team workspace
- Invite team members
- Collections sync automatically

**Option 3: Direct Share**
- Export files
- Share via email/Slack
- Team imports into their Postman

---

## 🐛 Troubleshooting

### Swagger UI Not Loading

```bash
# Rebuild User Service
docker-compose up -d --build quickbite-user-service

# Wait 10 seconds
Start-Sleep -Seconds 10

# Visit: http://localhost:3001/api-docs
```

### Postman: "Could not send request"

```bash
# Check services are running
docker-compose ps

# Restart if needed
docker-compose restart
```

### Postman: Unauthorized Errors

- Login again to refresh token
- Check environment is selected (top right)
- Verify token in environment variables

### Environment Variables Not Updating

- Ensure correct environment selected
- Check test scripts in requests
- Console output shows token saves

---

## 🎯 Next Steps

1. **Test all endpoints** in both Swagger and Postman
2. **Commit your changes** (collection + security fixes)
3. **Force push** to GitHub to remove exposed credentials
4. **Start DAY 2** - Restaurant Service with Redis caching

---

## 📚 Documentation Locations

- **Swagger UI:** http://localhost:3001/api-docs
- **Postman Collection:** `postman/QuickBite-API-Collection.json`
- **Postman Environment:** `postman/QuickBite-Dev-Environment.json`
- **Import Instructions:** `postman/README.md`
- **Main Project README:** `README.md`

---

**All set! 🚀 Your API documentation is production-ready and will grow with your project.**
