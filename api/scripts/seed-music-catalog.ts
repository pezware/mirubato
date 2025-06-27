#!/usr/bin/env node

/**
 * Script to seed Cloudflare KV with classical music composers and pieces
 * from the classical-music-composers-pieces.md file
 *
 * Usage: npx tsx scripts/seed-music-catalog.ts [--env production|staging|local]
 */

import fs from 'fs/promises'
import path from 'path'
import { parse } from 'yaml'

interface Composer {
  name: string
  fullName: string
  lifeSpan?: string
  tier: number
}

interface Piece {
  title: string
  composer: string
  gradeLevel: number
  instrument: 'PIANO' | 'GUITAR' | 'BOTH'
}

// Parse command line arguments
const args = process.argv.slice(2)
const envArg = args.find(arg => arg.startsWith('--env='))
const environment = envArg ? envArg.split('=')[1] : 'local'

async function parseComposersAndPieces(): Promise<{
  composers: Composer[]
  pieces: Piece[]
}> {
  const composers: Composer[] = []
  const pieces: Piece[] = []

  // Read the markdown file
  const filePath = path.join(
    process.cwd(),
    '../docs/classical-music-composers-pieces.md'
  )
  const content = await fs.readFile(filePath, 'utf-8')

  const lines = content.split('\n')

  let currentSection = ''
  let currentGrade = 0
  let isInPianoSection = false
  let isInGuitarSection = false

  for (const line of lines) {
    // Detect composer sections
    if (line.startsWith('### Tier ')) {
      currentSection = 'composers'
      continue
    }

    // Parse composers
    if (currentSection === 'composers' && line.match(/^\d+\.\s+\*\*/)) {
      const match = line.match(
        /^(\d+)\.\s+\*\*([^*]+)\*\*\s*\(([^)]+)\)?\s*-?\s*(.+)/
      )
      if (match) {
        const [, number, name, lifeSpan, description] = match
        composers.push({
          name: name.trim(),
          fullName: name.trim(),
          lifeSpan: lifeSpan?.trim(),
          tier:
            parseInt(number) <= 20
              ? 1
              : parseInt(number) <= 35
                ? 2
                : parseInt(number) <= 60
                  ? 3
                  : parseInt(number) <= 75
                    ? 4
                    : 5,
        })
      }
    }

    // Detect grade sections
    if (line.startsWith('### Grade ')) {
      const gradeMatch = line.match(/### Grade (\d+)/)
      if (gradeMatch) {
        currentGrade = parseInt(gradeMatch[1])
        currentSection = 'pieces'
      }
    }

    // Detect instrument subsections
    if (line.includes('#### Piano Pieces')) {
      isInPianoSection = true
      isInGuitarSection = false
      continue
    }
    if (line.includes('#### Classical Guitar Pieces')) {
      isInGuitarSection = true
      isInPianoSection = false
      continue
    }

    // Parse pieces
    if (currentSection === 'pieces' && line.match(/^\d+\.\s+\*\*/)) {
      const match = line.match(/^(\d+)\.\s+\*\*([^*]+)\*\*\s*-\s*(.+)/)
      if (match) {
        const [, , title, composerInfo] = match

        // Extract composer name from the info
        let composerName = composerInfo.trim()

        // Map common composer abbreviations to full names
        const composerMap: Record<string, string> = {
          Bach: 'Johann Sebastian Bach',
          'J.S. Bach': 'Johann Sebastian Bach',
          Beethoven: 'Ludwig van Beethoven',
          Mozart: 'Wolfgang Amadeus Mozart',
          Chopin: 'Frédéric Chopin',
          Schubert: 'Franz Schubert',
          Brahms: 'Johannes Brahms',
          Debussy: 'Claude Debussy',
          Schumann: 'Robert Schumann',
          Liszt: 'Franz Liszt',
          Rachmaninoff: 'Sergei Rachmaninoff',
          Tchaikovsky: 'Pyotr Ilyich Tchaikovsky',
          Haydn: 'Joseph Haydn',
          Scarlatti: 'Domenico Scarlatti',
          Ravel: 'Maurice Ravel',
          Grieg: 'Edvard Grieg',
          Mendelssohn: 'Felix Mendelssohn',
          Prokofiev: 'Sergei Prokofiev',
          Shostakovich: 'Dmitri Shostakovich',
          Satie: 'Erik Satie',
          Bartók: 'Béla Bartók',
          Scriabin: 'Alexander Scriabin',
          Dvořák: 'Antonín Dvořák',
          'C.P.E. Bach': 'Carl Philipp Emanuel Bach',
          Clementi: 'Muzio Clementi',
          Czerny: 'Carl Czerny',
          Albéniz: 'Isaac Albéniz',
          Granados: 'Enrique Granados',
          Falla: 'Manuel de Falla',
          'Villa-Lobos': 'Heitor Villa-Lobos',
          Tárrega: 'Francisco Tárrega',
          Sor: 'Fernando Sor',
          Giuliani: 'Mauro Giuliani',
          Barrios: 'Agustín Barrios Mangoré',
          Rodrigo: 'Joaquín Rodrigo',
          Brouwer: 'Leo Brouwer',
          Ponce: 'Manuel Ponce',
          Carulli: 'Ferdinando Carulli',
          Carcassi: 'Matteo Carcassi',
          Aguado: 'Dionisio Aguado',
          Llobet: 'Miguel Llobet',
          Joplin: 'Scott Joplin',
          Gershwin: 'George Gershwin',
          Diabelli: 'Anton Diabelli',
          Burgmüller: 'Johann Friedrich Burgmüller',
          Kuhlau: 'Friedrich Kuhlau',
          MacDowell: 'Edward MacDowell',
          Tcherepnin: 'Alexander Tcherepnin',
          Palmgren: 'Selim Palmgren',
          Messiaen: 'Olivier Messiaen',
          Fauré: 'Gabriel Fauré',
          'Saint-Saëns': 'Camille Saint-Saëns',
          Franck: 'César Franck',
          Hummel: 'Johann Nepomuk Hummel',
          Balakirev: 'Mily Balakirev',
          Khachaturian: 'Aram Khachaturian',
          Sorabji: 'Kaikhosru Shapurji Sorabji',
          Ives: 'Charles Ives',
          Ligeti: 'György Ligeti',
          Boulez: 'Pierre Boulez',
        }

        // First try to match the composer name before any Op. or other info
        const composerMatch = composerInfo.match(
          /^([^(,]+?)(?:\s+(?:Op\.|BWV|K\.|D\.|WoO|Anh\.|No\.).*)?$/
        )
        if (composerMatch) {
          const shortName = composerMatch[1].trim()
          // Look up in the map, fallback to the short name if not found
          composerName = composerMap[shortName] || shortName
        }

        pieces.push({
          title: title.trim(),
          composer: composerName,
          gradeLevel: currentGrade,
          instrument: isInPianoSection
            ? 'PIANO'
            : isInGuitarSection
              ? 'GUITAR'
              : 'BOTH',
        })
      }
    }
  }

  return { composers, pieces }
}

async function seedKV() {
  console.log(`Seeding KV for environment: ${environment}`)

  try {
    const { composers, pieces } = await parseComposersAndPieces()

    console.log(
      `Parsed ${composers.length} composers and ${pieces.length} pieces`
    )

    // Group pieces by composer
    const piecesByComposer: Record<string, Piece[]> = {}
    for (const piece of pieces) {
      const composerKey = piece.composer.toLowerCase()
      if (!piecesByComposer[composerKey]) {
        piecesByComposer[composerKey] = []
      }
      piecesByComposer[composerKey].push(piece)
    }

    // Prepare KV data
    const kvData = {
      // All composers list
      'composers:all': composers.map(c => c.fullName),

      // All pieces list
      'pieces:all': pieces,

      // Pieces grouped by composer
      ...Object.entries(piecesByComposer).reduce(
        (acc, [composer, pieces]) => ({
          ...acc,
          [`pieces:by-composer:${composer}`]: pieces,
        }),
        {}
      ),

      // Pieces by grade level
      ...Array.from({ length: 10 }, (_, i) => i + 1).reduce(
        (acc, grade) => ({
          ...acc,
          [`pieces:grade:${grade}`]: pieces.filter(p => p.gradeLevel === grade),
        }),
        {}
      ),

      // Pieces by instrument
      'pieces:instrument:piano': pieces.filter(
        p => p.instrument === 'PIANO' || p.instrument === 'BOTH'
      ),
      'pieces:instrument:guitar': pieces.filter(
        p => p.instrument === 'GUITAR' || p.instrument === 'BOTH'
      ),
    }

    // Write to JSON file for manual upload or wrangler kv:bulk put
    const outputPath = path.join(
      process.cwd(),
      `scripts/music-catalog-seed-${environment}.json`
    )
    await fs.writeFile(outputPath, JSON.stringify(kvData, null, 2))

    console.log(`KV seed data written to: ${outputPath}`)
    console.log('\nTo upload to Cloudflare KV:')
    console.log(`1. Create the KV namespace in Cloudflare dashboard`)
    console.log(`2. Get the namespace ID`)
    console.log(
      `3. Run: wrangler kv:bulk put --namespace-id=<YOUR_NAMESPACE_ID> < ${outputPath}`
    )

    // Also create a simpler format for wrangler kv:bulk
    const bulkData = Object.entries(kvData).map(([key, value]) => ({
      key,
      value: JSON.stringify(value),
    }))

    const bulkPath = path.join(
      process.cwd(),
      `scripts/music-catalog-bulk-${environment}.json`
    )
    await fs.writeFile(bulkPath, JSON.stringify(bulkData, null, 2))

    console.log(`\nAlternatively, use the bulk format: ${bulkPath}`)
  } catch (error) {
    console.error('Error seeding KV:', error)
    process.exit(1)
  }
}

// Run the script
seedKV().catch(console.error)
