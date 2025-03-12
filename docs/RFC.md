# System Overview
The Bookmarks API is a RESTful service that allows users to manage their bookmarks. Users can create, read, update, and delete bookmarks, as well as organize them by categories and mark them as favorites.

# Potential Future Improvements
- Add a rate limiting system to prevent abuse
- Add a Monitoring system grafana, prometheus, etc.

# API Endpoints

## Overview
This document defines all endpoints in the Bookmark Management API, including their request/response formats and error handling.

## Base URL
```
https://your-domain.com/api
```

## Authentication System

### Overview
The API uses JWT (JSON Web Token) based authentication with two types of tokens:
- **Access Token**: Short-lived token (15 minutes) used for API access
- **Refresh Token**: Long-lived token (7 days) used to obtain new access tokens

### Token Usage
1. Obtain tokens through registration or login
2. Include access token in Authorization header for protected endpoints
3. Use refresh token to get new access token when expired
4. Logout to invalidate tokens

### Protected vs Public Endpoints
- **Public Endpoints**: Only `/auth/*` endpoints
- **Protected Endpoints**: All other endpoints (bookmarks, categories, tags)

### Authentication Flow

1. **Register/Login** to obtain tokens
2. Use **Access Token** for API requests
3. When Access Token expires:
   - Use **Refresh Token** to get new Access Token
   - Continue API requests with new Access Token
4. **Logout** to invalidate tokens

### Headers for Protected Endpoints
```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

### Token Expiration
- Access Token: 15 minutes
- Refresh Token: 7 days

## Authentication Endpoints

### Register User
```http
POST /auth/register
```

#### Request
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Success Response (201 Created)
```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "abc123..."
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid registration data",
    "details": {
      "username": ["Username must be at least 3 characters"],
      "password": ["Password must be at least 8 characters"]
    }
  }
}
```

### Login
```http
POST /auth/login
```

#### Request
```json
{
  "username": "john_doe",
  "password": "securePassword123"
}
```

#### Success Response (200 OK)
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "abc123..."
  }
}
```

#### Error Response (401 Unauthorized)
```json
{
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "message": "Invalid username or password"
  }
}
```

### Refresh Token
```http
POST /auth/refresh-token
```

#### Request
```json
{
  "refreshToken": "abc123..."
}
```

#### Success Response (200 OK)
```json
{
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Error Response (401 Unauthorized)
```json
{
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "message": "Invalid refresh token"
  }
}
```

### Logout
```http
POST /auth/logout
```

#### Request
```json
{
  "refreshToken": "abc123..."
}
```

#### Success Response (200 OK)
```json
{
  "message": "Logout successful"
}
```

## Using Protected Endpoints

### Bookmark Endpoints (Protected)

All bookmark endpoints require authentication. Include the access token in the Authorization header.

#### Example: Get All Bookmarks
```http
GET /bookmarks
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### Example: Create Bookmark
```http
POST /bookmarks
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "title": "GitHub",
  "url": "https://github.com",
  "description": "Development platform",
  "categoryId": 1,
  "tags": ["coding", "tools"]
}
```

### Category Endpoints (Protected)

All category endpoints require authentication. Include the access token in the Authorization header.

#### Example: Get All Categories
```http
GET /categories
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### Example: Create Category
```http
POST /categories
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "name": "Development",
  "description": "Programming resources"
}
```

### Tag Endpoints (Protected)

All tag endpoints require authentication. Include the access token in the Authorization header.

#### Example: Get All Tags
```http
GET /tags
Authorization: Bearer eyJhbGciOiJIUzI1nIs...
```

#### Example: Create Tag
```http
POST /tags
Authorization: Bearer eyJhbGciOiJIUzI1nIs...
Content-Type: application/json

{
  "name": "coding",
  "description": "Programming related"
}
```

## Authentication Errors

### Missing Token (401 Unauthorized)
```json
{
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "message": "No token provided"
  }
}
```

### Invalid Token (401 Unauthorized)
```json
{
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "message": "Invalid token"
  }
}
```

### Expired Token (401 Unauthorized)
```json
{
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "message": "Token has expired"
  }
}
```
## Bookmark Endpoints

### Get All Bookmarks
```http
GET /bookmarks
```

#### Query Parameters
- `category_id` (optional): Filter by category
- `favorite` (optional): Filter favorites (true/false)
- `query` (optional): Search term
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sort_by` (optional): Field to sort by (title, created_at, updated_at)
- `sort_order` (optional): Sort direction (asc, desc)

#### Success Response (200 OK)
```json
{
  "message": "Bookmarks retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "GitHub",
        "url": "https://github.com",
        "description": "Development platform",
        "favorite": true,
        "category": {
          "id": 1,
          "name": "Development"
        },
        "tags": [
          { "id": 1, "name": "coding" }
        ],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  }
}
```

### Get Bookmark by ID
```http
GET /bookmarks/:id
```

#### Success Response (200 OK)
```json
{
  "message": "Bookmark retrieved successfully",
  "data": {
    "id": 1,
    "title": "GitHub",
    "url": "https://github.com",
    "description": "Development platform",
    "favorite": true,
    "category": {
      "id": 1,
      "name": "Development"
    },
    "tags": [
      { "id": 1, "name": "coding" }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Create Bookmark
```http
POST /bookmarks
```

#### Request
```json
{
  "title": "GitHub",
  "url": "https://github.com",
  "description": "Development platform",
  "favorite": false,
  "categoryId": 1,
  "tags": ["coding", "tools"]
}
```

#### Success Response (201 Created)
```json
{
  "message": "Bookmark created successfully",
  "data": {
    "id": 1,
    "title": "GitHub",
    "url": "https://github.com",
    "description": "Development platform",
    "favorite": false,
    "category": {
      "id": 1,
      "name": "Development"
    },
    "tags": [
      { "id": 1, "name": "coding" },
      { "id": 2, "name": "tools" }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Update Bookmark
```http
PUT /bookmarks/:id
```

#### Request
```json
{
  "title": "Updated Title",
  "favorite": true
}
```

#### Success Response (200 OK)
```json
{
  "message": "Bookmark updated successfully",
  "data": {
    "id": 1,
    "title": "Updated Title",
    "url": "https://github.com",
    "description": "Development platform",
    "favorite": true,
    "category": {
      "id": 1,
      "name": "Development"
    },
    "tags": [
      { "id": 1, "name": "coding" }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Delete Bookmark
```http
DELETE /bookmarks/:id
```

#### Success Response (200 OK)
```json
{
  "message": "Bookmark deleted successfully"
}
```

## Category Endpoints

### Get All Categories
```http
GET /categories
```

#### Success Response (200 OK)
```json
{
  "message": "Categories retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Development",
        "description": "Programming resources",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

### Get Category by ID
```http
GET /categories/:id
```

#### Success Response (200 OK)
```json
{
  "message": "Category retrieved successfully",
  "data": {
    "id": 1,
    "name": "Development",
    "description": "Programming resources",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Create Category
```http
POST /categories
```

#### Request
```json
{
  "name": "Development",
  "description": "Programming resources"
}
```

#### Success Response (201 Created)
```json
{
  "message": "Category created successfully",
  "data": {
    "id": 1,
    "name": "Development",
    "description": "Programming resources",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Update Category
```http
PUT /categories/:id
```

#### Request
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### Success Response (200 OK)
```json
{
  "message": "Category updated successfully",
  "data": {
    "id": 1,
    "name": "Updated Name",
    "description": "Updated description",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Delete Category
```http
DELETE /categories/:id
```

#### Success Response (200 OK)
```json
{
  "message": "Category deleted successfully"
}
```

## Tag Endpoints

### Get All Tags
```http
GET /tags
```

#### Success Response (200 OK)
```json
{
  "message": "Tags retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "coding",
        "description": "Programming related",
        "userId": 1,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 20,
      "page": 1,
      "limit": 10,
      "pages": 2
    }
  }
}
```

### Get Tag by ID
```http
GET /tags/:id
```

#### Success Response (200 OK)
```json
{
  "message": "Tag retrieved successfully",
  "data": {
    "id": 1,
    "name": "coding",
    "description": "Programming related",
    "userId": 1,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Create Tag
```http
POST /tags
```

#### Request
```json
{
  "name": "coding",
  "description": "Programming related"
}
```

#### Success Response (201 Created)
```json
{
  "message": "Tag created successfully",
  "data": {
    "id": 1,
    "name": "coding",
    "description": "Programming related",
    "userId": 1,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Update Tag
```http
PUT /tags/:id
```

#### Request
```json
{
  "name": "programming",
  "description": "Updated description"
}
```

#### Success Response (200 OK)
```json
{
  "message": "Tag updated successfully",
  "data": {
    "id": 1,
    "name": "programming",
    "description": "Updated description",
    "userId": 1,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Delete Tag
```http
DELETE /tags/:id
```

#### Success Response (200 OK)
```json
{
  "message": "Tag deleted successfully"
}
```

## Common Error Responses

### Validation Error (400 Bad Request)
```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "{field}": "_errors" : ["Error message"]
    }
  }
}
```

### Authentication Error (401 Unauthorized)
```json
{
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "message": "Invalid or missing authentication token"
  }
}
```

### Not Found Error (404 Not Found)
```json
{
  "error": {
    "type": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### Internal Server Error (500 Internal Server Error)
```json
{
  "error": {
    "type": "INTERNAL_ERROR",
    "message": "Internal server error"
  }
}
``` 