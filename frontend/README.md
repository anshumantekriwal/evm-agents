# EVM Agents Frontend

A React TypeScript application with Auth0 authentication built using Vite.

## Features

- 🔐 **Auth0 Authentication** - Secure sign-in/sign-out functionality
- 🛡️ **Protected Routes** - Content protection based on authentication status
- 👤 **User Profile** - Display user information when authenticated
- ⚡ **Vite** - Fast development and build tooling
- 📱 **TypeScript** - Type-safe development

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_APP_TITLE=EVM Agents Frontend
VITE_API_URL=http://localhost:3000
VITE_APP_VERSION=1.0.0
NODE_ENV=development
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_KEY=your_supabase_key
VITE_AUTH0_DOMAIN=your_auth0_domain
VITE_AUTH0_CLIENT_ID=your_auth0_client_id
PORT=5173
```

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Project Structure

```
src/
├── components/
│   ├── AuthButton.tsx      # Login/Logout button component
│   ├── AuthProvider.tsx    # Auth0 provider wrapper
│   ├── ProtectedRoute.tsx  # Route protection component
│   └── UserProfile.tsx     # User profile display
├── App.tsx                 # Main application component
├── main.tsx               # Application entry point
└── ...
```

## Auth0 Setup

1. Create an Auth0 application at [auth0.com](https://auth0.com)
2. Configure the following settings:
   - **Allowed Callback URLs**: `http://localhost:5173`
   - **Allowed Logout URLs**: `http://localhost:5173`
   - **Allowed Web Origins**: `http://localhost:5173`
3. Copy your Domain and Client ID to the `.env` file

## Components

### AuthButton

Handles login and logout functionality with a clean UI.

### AuthProvider

Wraps the application with Auth0 context and configuration.

### ProtectedRoute

Protects content that requires authentication.

### UserProfile

Displays user information when authenticated.

## Development

The application uses:

- **React 19** with hooks
- **TypeScript** for type safety
- **Auth0 React SDK** for authentication
- **Vite** for fast development and building
