# Music Library Download Instructions

## Overview

This directory contains metadata for 10 carefully selected public domain pieces from IMSLP. The PDFs need to be downloaded manually due to IMSLP's terms of use.

## Piano Pieces

1. **Bach - Prelude in C Major (BWV 846)**
   - Search: "Bach Well Tempered Clavier Book 1"
   - Look for: Clean Urtext edition, 1-2 pages
   - Save as: `piano/bach-prelude-c-major-bwv846.pdf`

2. **Beethoven - Für Elise**
   - Search: "Beethoven Für Elise"
   - Look for: Clear edition without excessive editorial markings, 3-4 pages
   - Save as: `piano/beethoven-fur-elise.pdf`

3. **Chopin - Waltz in A minor (B. 150)**
   - Search: "Chopin Waltz A minor posthumous"
   - Look for: 2-page edition with clear dynamics
   - Save as: `piano/chopin-waltz-a-minor.pdf`

4. **Mozart - Sonata No. 11 K.331 (1st movement)**
   - Search: "Mozart Sonata 11 K331"
   - Look for: First movement only, 4-6 pages
   - Save as: `piano/mozart-sonata-11-k331-mov1.pdf`

5. **Chopin - Nocturne Op. 9 No. 2**
   - Search: "Chopin Nocturne Op 9 No 2"
   - Look for: Edition with clear pedal markings, 3-4 pages
   - Save as: `piano/chopin-nocturne-op9-no2.pdf`

## Guitar Pieces

6. **Tárrega - Lágrima**
   - Search: "Tarrega Lagrima"
   - Look for: 1-page edition with fingerings
   - Save as: `guitar/tarrega-lagrima.pdf`

7. **Anonymous - Romance (Spanish Romance)**
   - Search: "Spanish Romance guitar"
   - Look for: Edition with both notation and TAB, 1-2 pages
   - Save as: `guitar/anonymous-romance.pdf`

8. **Sor - Study Op. 35 No. 22**
   - Search: "Sor Study Op 35 No 22"
   - Look for: Clear edition, 1-2 pages
   - Save as: `guitar/sor-study-op35-no22.pdf`

9. **Villa-Lobos - Prelude No. 1**
   - Search: "Villa-Lobos Prelude 1"
   - Look for: Modern edition, 2-3 pages
   - Save as: `guitar/villa-lobos-prelude-1.pdf`

10. **Tárrega - Recuerdos de la Alhambra**
    - Search: "Tarrega Recuerdos de la Alhambra"
    - Look for: Edition with clear tremolo notation, 2-3 pages
    - Save as: `guitar/tarrega-recuerdos-alhambra.pdf`

## Quality Criteria

When selecting PDFs from IMSLP:

- Choose editions with clear, readable notation
- Avoid overly annotated "teaching editions"
- Look for consistent page formatting
- Check that the PDF is complete (all pages present)
- Prefer vector PDFs over scanned images when possible

## Testing

After downloading, use this command to verify PDFs:

```bash
cd scores/music-library
ls -la piano/*.pdf guitar/*.pdf
# Each file should be readable and between 50KB-2MB
```
