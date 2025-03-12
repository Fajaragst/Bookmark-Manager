# Bookmark Management API

A RESTful API for managing bookmarks, built with Hono.js and Drizzle ORM.

## Features

- User authentication with JWT
- CRUD operations for bookmarks
- Category management
- Tag support

## Setup

### Local Setup

1. Clone the repository
2. Install dependencies:
   ```sh
   bun install
   ```
3. Set up environment variables and Edit the .env file with your specific configuration:
   ```sh
   # Copy the example environment file
   cp .env.example .env
   ```
4. Run database migrations:
   ```sh
   bun run migrate
   ```
5. Start the server:
   ```sh
   bun run start
   # or 
   bun run dev
   ```

### Docker Setup

1. Make sure you have Docker and Docker Compose installed on your system.

2. Set up environment variables and Edit the .env file with your specific configuration:
   ```sh
   # Copy the example environment file
   cp .env.example .env
   ```

3. Build and start the containers:
   ```sh
   docker-compose up --build
   ```

The API will be available at `http://localhost:3000`.

To stop the containers:
```
docker-compose down
```

## Testing

### Unit Tests

Run unit tests:
```
bun run test:unit
```

### Integration Tests

Integration tests use a separate test database to ensure they don't interfere with your development database.
1. Create database `bookmarks_test` on your local postgres
2. Create a `.env.test` file with test database configuration:
   ```sh
   DATABASE_URL=postgres://username:password@localhost:5432/bookmarks_test
   JWT_SECRET=test_jwt_secret
   ```

2. Run integration tests:
   ```sh
   bun run test:integration
   ```

The integration tests will:
- Create a test database if it doesn't exist
- Drop all tables to ensure a clean state
- Run migrations on the test database
- Execute all integration tests
- Clean up after tests are complete
