# Xade Agents Frontend Setup Guide

## Quick Start

The frontend is now fully set up and ready to use! Here's what you need to do to get it running:

### 1. Environment Configuration

Create a `.env` file in this directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_KEY=your_deployer_api_key
VITE_DEPLOYER_URL=http://54.166.244.200
```

### 2. Database Setup

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in your Supabase dashboard
3. Copy and paste the contents of `solana-agents-table-schema.sql` and run it
4. This will create the `solana_agents` table with comprehensive agent details and proper security policies

**Note**: The new `solana_agents` table stores comprehensive information including:
- Auto-generated UUID as agent ID
- User details (ID and email)
- Agent configuration and prompt
- AWS URL and owner address
- Agent wallet (extracted from logs/status)
- Deployment status and timestamps

### 3. Start Development Server

The server is already running! If you need to restart it:

```bash
npm run dev
```

The app will be available at http://localhost:5173

**Note**: The app should now load without any import errors. You'll see the authentication page even without Supabase credentials configured.

## What's Included

### ✅ Complete Authentication System
- User registration and login
- Supabase integration
- Protected routes
- Session management

### ✅ Bot Deployment Interface
- **DCA Bots**: Set up dollar-cost averaging strategies
- **Range Bots**: Configure buy-low, sell-high trading
- **Custom Bots**: AI-generated bots from natural language descriptions

### ✅ Dashboard & Monitoring
- View all deployed bots
- Real-time status updates
- Direct links to bot logs
- Bot management (delete, refresh status)

### ✅ Modern UI/UX
- Responsive design (mobile + desktop)
- Tailwind CSS styling
- Lucide icons
- Loading states and error handling

### ✅ API Integration
- Deployer API integration (`http://54.166.244.200`)
- Bot status and logs fetching
- Proper error handling and timeouts

## Architecture

```
Frontend (React + TypeScript)
├── Authentication (Supabase Auth)
├── Database (Supabase PostgreSQL)
├── API Layer (Custom service)
└── UI Components (Tailwind CSS)
```

## User Flow

1. **Sign Up/Login**: Users create accounts via Supabase
2. **Deploy Bots**: Choose bot type and configure parameters
3. **Monitor**: View bot status, logs, and performance
4. **Manage**: Delete bots or refresh their status

## Bot Types Supported

### DCA (Dollar Cost Averaging)
- Regular interval purchases
- Configurable tokens and amounts
- Perfect for long-term strategies

### Range Trading
- Price-based buy/sell triggers
- Configurable price ranges
- Ideal for sideways markets

### Custom AI Bots
- Natural language strategy descriptions
- AI-generated trading logic
- Supports complex multi-condition strategies

## Next Steps

1. **Set up your Supabase project** using the provided schema
2. **Add your environment variables**
3. **Test the authentication flow**
4. **Deploy a test bot** to verify the integration
5. **Customize the UI** as needed for your brand

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Make sure your `.env` file is in the frontend directory
   - Verify the variable names match exactly

2. **Database errors**
   - Ensure you've run the `database-schema.sql` in Supabase
   - Check that RLS policies are enabled

3. **API connection issues**
   - Verify the deployer API is running at `http://54.166.244.200`
   - Check that your API key is correct

4. **Build errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check for TypeScript errors with `npm run type-check`

### Getting Help

- Check the browser console for detailed error messages
- Verify network requests in the browser dev tools
- Ensure all environment variables are set correctly

## Production Deployment

When ready to deploy:

1. Run `npm run build` to create production build
2. Deploy the `dist/` folder to your hosting platform
3. Set environment variables in your hosting platform
4. Ensure your Supabase project allows your production domain

The frontend is now complete and ready for use! 🚀
