# Jikan Anime Tracker - Backend API

Lightweight Node.js + Express.js backend using Mongoose (MongoDB) to replace local storage for an Anime Tracker application.

## Features
- **No Password Authentication**: Users identify solely using a unique `username`.
- **Automatic Registration/Login**: Seamless experience for existing and new users.
- **Anime List Management**: Save, status update (`watching`, `completed`, `plan_to_watch`, `dropped`), episode tracking, and score rating.
- **Production-Ready Error Handling**: Handles 400, 404, 500 status codes, Mongoose validation, and duplicate keys gracefully.

---

## Project Structure
```text
jikan-anime-backend/
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/
│   ├── animeController.js    # Logic for anime collection CRUD
│   └── userController.js     # Logic for login/registration
├── middleware/
│   └── errorHandler.js     # Centralized error & 404 handler
├── models/
│   ├── Anime.js              # Anime schema & indexes
│   └── User.js               # User schema
├── routes/
│   ├── animeRoutes.js        # /api/anime routes
│   └── userRoutes.js        # /api/users routes
├── .env.example              # Sample environment variables
├── .env                      # Local environment configuration
├── package.json              # Dependencies and scripts
└── server.js                 # Express server entry point
```

---

## Prerequisites
- **Node.js** (v16+ recommended)
- **MongoDB** running locally (`mongodb://127.0.0.1:27017`) or a **MongoDB Atlas** connection URI string.

---

## Installation & Setup

1. **Navigate to the backend directory**:
   ```bash
   cd jikan-anime-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create or edit `.env` file in the root of `jikan-anime-backend`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/jikan_anime_db
   ```

4. **Run the server**:
   - **Production mode**:
     ```bash
     npm start
     ```
   - **Development mode (with auto-reload)**:
     ```bash
     npm run dev
     ```

---

## API Endpoints Reference

### 1. User Login / Registration
- **Endpoint**: `POST /api/users/login-or-register`
- **Description**: Checks if user exists by `username`. If yes, returns user profile. If not, creates new user.
- **Request Body**:
  ```json
  {
    "username": "siyam"
  }
  ```
- **Response (200 / 201)**:
  ```json
  {
    "success": true,
    "message": "User logged in successfully",
    "data": {
      "_id": "66b8df...",
      "username": "siyam",
      "createdAt": "2026-08-12T08:38:00.000Z"
    }
  }
  ```

---

### 2. Get User's Anime List
- **Endpoint**: `GET /api/anime/:username`
- **Description**: Retrieves all saved anime entries for the specified user.
- **Response (200)**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "_id": "66b8e2...",
        "user": "66b8df...",
        "animeId": "20",
        "title": "Naruto",
        "coverImage": "https://cdn.myanimelist.net/images/anime/13/17405.jpg",
        "status": "watching",
        "episodesWatched": 12,
        "score": 9,
        "createdAt": "2026-08-12T08:40:00.000Z",
        "updatedAt": "2026-08-12T08:40:00.000Z"
      }
    ]
  }
  ```

---

### 3. Add or Update Anime Entry (Upsert)
- **Endpoint**: `POST /api/anime/:username`
- **Description**: Adds a new anime to user's list or updates existing one if `animeId` matches.
- **Request Body**:
  ```json
  {
    "animeId": "20",
    "title": "Naruto",
    "coverImage": "https://cdn.myanimelist.net/images/anime/13/17405.jpg",
    "status": "watching",
    "episodesWatched": 12,
    "score": 9
  }
  ```
- **Allowed Status Enum**: `watching`, `completed`, `plan_to_watch`, `dropped`
- **Response (200)**:
  ```json
  {
    "success": true,
    "message": "Anime list updated successfully",
    "data": {
      "_id": "66b8e2...",
      "user": "66b8df...",
      "animeId": "20",
      "title": "Naruto",
      "status": "watching",
      "episodesWatched": 12,
      "score": 9
    }
  }
  ```

---

### 4. Delete Anime Entry
- **Endpoint**: `DELETE /api/anime/:username/:animeId`
- **Description**: Removes an anime from specified user's collection.
- **Response (200)**:
  ```json
  {
    "success": true,
    "message": "Anime removed from collection successfully"
  }
  ```
