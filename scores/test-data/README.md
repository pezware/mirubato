# Test Score Data

This directory contains sample PDF scores for testing the Scorebook feature.

## Files

### score_01.pdf - Aire Sureño

- **Composer**: Agustín Barrios Mangoré
- **Instrument**: Classical Guitar
- **Difficulty**: Intermediate-Advanced
- **Pages**: 1
- **Features**: Guitar-specific notation (fingerings, barrés)
- **Use Case**: Testing single-page display, guitar notation rendering

### score_02.pdf - Romance (Spanish Romance)

- **Composer**: Anonymous (arr. Eythor Thorlaksson)
- **Instrument**: Classical Guitar
- **Difficulty**: Intermediate
- **Pages**: 3 (title page + 2 music pages)
- **Features**: Multi-page navigation, title page handling
- **Use Case**: Testing pagination, page navigation, continuous scrolling

## Usage

### Local Development

1. Start the scores service:

   ```bash
   cd scores
   npm run dev
   ```

2. Seed the test data:

   ```bash
   npm run seed:local
   ```

3. Verify the data:
   ```bash
   npm run test:api
   ```

### Staging Deployment

1. Deploy to staging:

   ```bash
   npm run deploy:staging
   ```

2. Seed staging data:
   ```bash
   npm run seed:staging
   ```

## Notes

- These PDFs are for testing purposes only
- Both scores are classical guitar pieces, suitable for testing guitar-specific notation
- The multi-page PDF (score_02) is essential for testing pagination features
- High-quality PDFs ensure good rendering quality in the application
