# Xade Agents Frontend

A modern React frontend for managing Solana trading bots with AI-powered code generation.

## Features

- **User Authentication**: Secure login/signup with Supabase
- **Bot Deployment**: Deploy DCA, Range, and Custom AI-generated bots
- **Real-time Monitoring**: View bot status, logs, and performance
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Built with Tailwind CSS and Lucide icons

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Charts**: Recharts (for future analytics)

## Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Environment Variables

Create a `.env` file in the frontend directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# API Configuration
VITE_API_KEY=your_api_key_here
VITE_DEPLOYER_URL=http://54.166.244.200

# App Configuration
VITE_APP_NAME=Xade Agents
VITE_APP_VERSION=1.0.0
```

### Database Setup

1. Create a new Supabase project
2. Run the SQL commands from `database-schema.sql` in the Supabase SQL editor
3. This will create the necessary tables and security policies

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── auth/            # Authentication components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── DeployBotForm.tsx # Bot deployment form
│   ├── Layout.tsx       # App layout wrapper
│   └── ProtectedRoute.tsx # Route protection
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication context
├── lib/                 # Utility libraries
│   ├── api.ts          # API service for deployer
│   └── supabase.ts     # Supabase client and types
├── pages/              # Page components
│   └── AuthPage.tsx    # Login/signup page
├── App.tsx             # Main app component
├── main.tsx           # App entry point
└── index.css          # Global styles with Tailwind
```

## Bot Types

### DCA (Dollar Cost Averaging)
- Automatically buy tokens at regular intervals
- Configure: tokens, amount, interval
- Perfect for long-term investing strategies

### Range Trading
- Buy at low prices, sell at high prices
- Configure: tokens, amount, buy/sell prices
- Ideal for sideways market conditions

### Custom AI Bots
- Describe your strategy in natural language
- AI generates custom trading logic
- Supports complex multi-condition strategies

## API Integration

The frontend integrates with:

- **Deployer API** (`http://54.166.244.200`): Bot deployment and management
- **Bot URLs**: Direct communication with deployed bots for logs and status
- **Supabase**: User management and bot metadata storage

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own bots and data
- API keys are environment-specific
- All external API calls are properly authenticated

## Development

### Adding New Components

1. Create component in appropriate directory
2. Use TypeScript for type safety
3. Follow existing patterns for styling and state management
4. Add proper error handling and loading states

### Styling Guidelines

- Use Tailwind utility classes
- Follow the design system defined in `index.css`
- Use semantic color names (primary, success, danger, etc.)
- Ensure responsive design with mobile-first approach

### State Management

- Use React Context for global state (auth)
- Local component state for UI interactions
- Supabase for persistent data storage
- API service layer for external integrations

## Deployment

### Environment Setup

1. Set up environment variables in your hosting platform
2. Ensure Supabase project is configured correctly
3. Verify API endpoints are accessible

### Build Process

```bash
# Build for production
npm run build

# The dist/ folder contains the built application
# Deploy this folder to your hosting platform
```

### Hosting Options

- **Vercel**: Automatic deployments from Git
- **Netlify**: Easy static site hosting
- **AWS S3 + CloudFront**: Scalable static hosting
- **Any static hosting service**

## Troubleshooting

### Common Issues

1. **Supabase Connection**: Verify environment variables and project settings
2. **API Errors**: Check deployer API status and authentication
3. **Build Errors**: Ensure all dependencies are installed correctly
4. **Styling Issues**: Verify Tailwind CSS is configured properly

### Debug Mode

Set `NODE_ENV=development` to enable:
- Detailed error messages
- Console logging
- Development-only features

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new code
3. Test components thoroughly before submitting
4. Update documentation for any new features

## License

This project is part of the Xade Agents ecosystem. See the main project README for license information.