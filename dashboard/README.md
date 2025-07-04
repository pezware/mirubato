# Mirubato Documentation Dashboard

A unified documentation and status monitoring dashboard for all Mirubato services, hosted on GitHub Pages at [docs.mirubato.com](https://docs.mirubato.com).

## Overview

This dashboard provides:

- **Real-time service status monitoring** for Frontend, API, and Scores services
- **Unified documentation hub** with links to all service documentation
- **Environment information** for Production, Staging, and Local development
- **Health check aggregation** from all backend services

## Architecture

The dashboard is a static site that:

- Fetches health data from live services in real-time
- Uses Mirubato's Morandi design system for consistency
- Provides responsive design for mobile and desktop
- Updates every 30 seconds automatically

## Services Monitored

### Frontend (React App)

- **Production**: https://mirubato.com
- **Staging**: https://staging.mirubato.com
- **Technology**: React + Cloudflare Workers

### API (Backend)

- **Production**: https://api.mirubato.com
- **Staging**: https://api-staging.mirubato.com
- **Technology**: Hono + D1 + Cloudflare Workers

### Scores (Sheet Music Service)

- **Production**: https://scores.mirubato.com
- **Staging**: https://scores-staging.mirubato.com
- **Technology**: Hono + D1 + R2 + Cloudflare Workers

## Local Development

To run this dashboard locally:

1. Clone the repository
2. Navigate to the `dashboard/` directory
3. Serve the files with any static server:

   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve .

   # Using GitHub Pages locally
   bundle exec jekyll serve
   ```

## Features

- **Status Indicators**: Real-time health monitoring with visual indicators
- **Responsive Design**: Works on all device sizes
- **Auto-refresh**: Updates every 30 seconds
- **Manual Refresh**: Click system status to refresh immediately
- **Error Handling**: Graceful degradation when services are unavailable
- **Performance**: Lightweight and fast loading

## Contributing

This dashboard is part of the main Mirubato repository. To contribute:

1. Make changes to files in the `dashboard/` directory
2. Test locally to ensure everything works
3. Submit a pull request to the main repository
4. Changes will be automatically deployed to docs.mirubato.com

## License

MIT License - See the main repository for details.
