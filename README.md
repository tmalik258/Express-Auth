# Authentication API

This project is a RESTful API for user authentication using Express.js, Prisma, and PostgreSQL. It supports user signup, login, email verification, password reset, and token-based authentication.

## Features

- **User Signup**: Allows users to create an account.
- **Login**: Allows users to log in using email and password.
- **Email Verification**: Sends a verification token to the user's email after signup.
- **Password Management**:
  - Forgot password: Sends a reset link to the user's email.
  - Reset password: Allows users to reset their password with a valid token.
  - Set password: Allows users to set a new password after email verification.
- **Token-based Authentication**: Uses JWT tokens for secure authentication and session management.
- **Check Auth**: Verifies the user's authentication status.

## Prerequisites

- Node.js (version >= 14.x)
- PostgreSQL
- Prisma
- Environment variables for sensitive data (like `DATABASE_URL`, `JWT_SECRET`, etc.)

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/auth-api.git
   cd auth-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following values:
   ```env
   DATABASE_URL=your_postgresql_database_url
   JWT_SECRET=your_jwt_secret
   CLIENT_URL=http://localhost:3000
   ```

4. Set up the Prisma database:
   Run the following commands to generate Prisma client and migrate the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

## API Endpoints

### Authentication

- **POST** `/api/auth/signup` - Sign up a new user.
  - **Body**: `{ "email": "user@example.com", "name": "John Doe" }`
  
- **POST** `/api/auth/login` - Log in an existing user.
  - **Body**: `{ "email": "user@example.com", "password": "yourpassword" }`

- **POST** `/api/auth/logout` - Log out the current user.

- **GET** `/api/auth/check-auth` - Check the current authentication status of the user.
  - **Headers**: `Authorization: Bearer <token>`

### Email Verification

- **POST** `/api/auth/verifyEmail` - Verify the user's email using a verification code.
  - **Body**: `{ "email": "user@example.com", "code": "123456" }`

### Password Management

- **POST** `/api/auth/forgot-password` - Request a password reset link.
  - **Body**: `{ "email": "user@example.com" }`

- **POST** `/api/auth/reset-password/:token` - Reset the password using the reset token.
  - **Params**: `token` - The reset token received in the email.
  - **Body**: `{ "email": "user@example.com", "password": "newpassword" }`

- **POST** `/api/auth/set-password/:token` - Set the password after email verification.
  - **Params**: `token` - The password set token received in the email.
  - **Body**: `{ "email": "user@example.com", "password": "newpassword" }`

## Database Schema

This application uses **Prisma** ORM to interact with the PostgreSQL database. The main model is `User` and it contains the following fields:

```prisma
model User {
  id                        String    @id @default(uuid())
  name                      String    @db.Text
  email                     String    @unique
  password                  String?
  lastLogin                 DateTime  @default(now())
  isVerified                Boolean   @default(false)
  setPasswordToken          String?
  setPasswordExpiresAt      DateTime?
  resetPasswordToken        String?
  resetPasswordExpiresAt    DateTime?
  verificationToken         String?
  verificationTokenExpiresAt DateTime?
}
```

## Running the Application

1. Start the server:
   ```bash
   npm run dev
   ```
   The server will run on `http://localhost:5000` by default.

2. Use Postman or any other API testing tool to test the API endpoints.

## Testing

Currently, no tests are included in this repository. You may add tests using any testing framework of your choice (e.g., Jest, Mocha).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.