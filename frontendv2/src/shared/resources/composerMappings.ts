/**
 * Canonical Composer Name Mappings
 *
 * This shared resource file contains the mapping of composer name variations
 * to their canonical (standard) forms. It's used by both frontend and backend
 * to ensure consistency in composer name handling across the application.
 *
 * To add a new composer:
 * 1. Add the canonical name as the value
 * 2. Add all known variations as keys (lowercase)
 * 3. Include common misspellings and abbreviations
 *
 * Format: 'variation': 'Canonical Name'
 */

export const COMPOSER_CANONICAL_NAMES: Record<string, string> = {
  // ==========================================
  // BAROQUE ERA (1600-1750)
  // ==========================================

  // Bach family
  bach: 'Johann Sebastian Bach',
  'j.s. bach': 'Johann Sebastian Bach',
  'js bach': 'Johann Sebastian Bach',
  'j s bach': 'Johann Sebastian Bach',
  'johann sebastian bach': 'Johann Sebastian Bach',
  'bach, johann sebastian': 'Johann Sebastian Bach',
  'bach, j.s.': 'Johann Sebastian Bach',
  'bach js': 'Johann Sebastian Bach',
  'jean-sébastien bach': 'Johann Sebastian Bach', // French variation

  'c.p.e. bach': 'Carl Philipp Emanuel Bach',
  'cpe bach': 'Carl Philipp Emanuel Bach',
  'carl philipp emanuel bach': 'Carl Philipp Emanuel Bach',
  'bach, c.p.e.': 'Carl Philipp Emanuel Bach',

  'j.c. bach': 'Johann Christian Bach',
  'jc bach': 'Johann Christian Bach',
  'johann christian bach': 'Johann Christian Bach',

  // Handel
  handel: 'George Frideric Handel',
  händel: 'George Frideric Handel',
  'g.f. handel': 'George Frideric Handel',
  'gf handel': 'George Frideric Handel',
  'george frideric handel': 'George Frideric Handel',
  'georg friedrich händel': 'George Frideric Handel',
  'handel, george frideric': 'George Frideric Handel',

  // Vivaldi
  vivaldi: 'Antonio Vivaldi',
  'a. vivaldi': 'Antonio Vivaldi',
  'antonio vivaldi': 'Antonio Vivaldi',
  'vivaldi, antonio': 'Antonio Vivaldi',

  // Scarlatti
  scarlatti: 'Domenico Scarlatti',
  'd. scarlatti': 'Domenico Scarlatti',
  'domenico scarlatti': 'Domenico Scarlatti',
  'scarlatti, domenico': 'Domenico Scarlatti',

  // Purcell
  purcell: 'Henry Purcell',
  'h. purcell': 'Henry Purcell',
  'henry purcell': 'Henry Purcell',

  // Rameau
  rameau: 'Jean-Philippe Rameau',
  'j.p. rameau': 'Jean-Philippe Rameau',
  'jean-philippe rameau': 'Jean-Philippe Rameau',

  // Telemann
  telemann: 'Georg Philipp Telemann',
  'g.p. telemann': 'Georg Philipp Telemann',
  'georg philipp telemann': 'Georg Philipp Telemann',

  // ==========================================
  // CLASSICAL ERA (1750-1820)
  // ==========================================

  // Mozart
  mozart: 'Wolfgang Amadeus Mozart',
  'w.a. mozart': 'Wolfgang Amadeus Mozart',
  'wa mozart': 'Wolfgang Amadeus Mozart',
  'wolfgang amadeus mozart': 'Wolfgang Amadeus Mozart',
  'mozart, wolfgang amadeus': 'Wolfgang Amadeus Mozart',
  'wolfgang mozart': 'Wolfgang Amadeus Mozart',

  // Beethoven
  beethoven: 'Ludwig van Beethoven',
  'l. beethoven': 'Ludwig van Beethoven',
  'l.v. beethoven': 'Ludwig van Beethoven',
  'lv beethoven': 'Ludwig van Beethoven',
  'ludwig van beethoven': 'Ludwig van Beethoven',
  'beethoven, ludwig van': 'Ludwig van Beethoven',
  'ludwig beethoven': 'Ludwig van Beethoven',

  // Haydn
  haydn: 'Joseph Haydn',
  'j. haydn': 'Joseph Haydn',
  'joseph haydn': 'Joseph Haydn',
  'haydn, joseph': 'Joseph Haydn',
  'franz joseph haydn': 'Joseph Haydn',

  // Clementi
  clementi: 'Muzio Clementi',
  'm. clementi': 'Muzio Clementi',
  'muzio clementi': 'Muzio Clementi',

  // ==========================================
  // ROMANTIC ERA (1820-1910)
  // ==========================================

  // Chopin
  chopin: 'Frédéric Chopin',
  'frederic chopin': 'Frédéric Chopin',
  'frédéric chopin': 'Frédéric Chopin',
  'f. chopin': 'Frédéric Chopin',
  'chopin, frédéric': 'Frédéric Chopin',
  'fryderyk chopin': 'Frédéric Chopin', // Polish spelling

  // Liszt
  liszt: 'Franz Liszt',
  'f. liszt': 'Franz Liszt',
  'franz liszt': 'Franz Liszt',
  'liszt, franz': 'Franz Liszt',
  'liszt ferenc': 'Franz Liszt', // Hungarian order

  // Brahms
  brahms: 'Johannes Brahms',
  'j. brahms': 'Johannes Brahms',
  'johannes brahms': 'Johannes Brahms',
  'brahms, johannes': 'Johannes Brahms',

  // Schumann
  schumann: 'Robert Schumann',
  'r. schumann': 'Robert Schumann',
  'robert schumann': 'Robert Schumann',
  'schumann, robert': 'Robert Schumann',

  'clara schumann': 'Clara Schumann',
  'c. schumann': 'Clara Schumann',
  'schumann, clara': 'Clara Schumann',

  // Schubert
  schubert: 'Franz Schubert',
  'f. schubert': 'Franz Schubert',
  'franz schubert': 'Franz Schubert',
  'schubert, franz': 'Franz Schubert',

  // Mendelssohn
  mendelssohn: 'Felix Mendelssohn',
  'f. mendelssohn': 'Felix Mendelssohn',
  'felix mendelssohn': 'Felix Mendelssohn',
  'mendelssohn, felix': 'Felix Mendelssohn',
  'mendelssohn-bartholdy': 'Felix Mendelssohn',
  'felix mendelssohn-bartholdy': 'Felix Mendelssohn',

  // Rachmaninoff
  rachmaninoff: 'Sergei Rachmaninoff',
  rachmaninov: 'Sergei Rachmaninoff',
  's. rachmaninoff': 'Sergei Rachmaninoff',
  's. rachmaninov': 'Sergei Rachmaninoff',
  'sergei rachmaninoff': 'Sergei Rachmaninoff',
  'sergey rachmaninov': 'Sergei Rachmaninoff',
  'rachmaninoff, sergei': 'Sergei Rachmaninoff',
  рахманинов: 'Sergei Rachmaninoff', // Cyrillic

  // Tchaikovsky
  tchaikovsky: 'Pyotr Ilyich Tchaikovsky',
  tschaikowsky: 'Pyotr Ilyich Tchaikovsky',
  čajkovskij: 'Pyotr Ilyich Tchaikovsky',
  'p.i. tchaikovsky': 'Pyotr Ilyich Tchaikovsky',
  'pi tchaikovsky': 'Pyotr Ilyich Tchaikovsky',
  'pyotr ilyich tchaikovsky': 'Pyotr Ilyich Tchaikovsky',
  'tchaikovsky, pyotr ilyich': 'Pyotr Ilyich Tchaikovsky',
  чайковский: 'Pyotr Ilyich Tchaikovsky', // Cyrillic

  // Wagner
  wagner: 'Richard Wagner',
  'r. wagner': 'Richard Wagner',
  'richard wagner': 'Richard Wagner',
  'wagner, richard': 'Richard Wagner',

  // Verdi
  verdi: 'Giuseppe Verdi',
  'g. verdi': 'Giuseppe Verdi',
  'giuseppe verdi': 'Giuseppe Verdi',
  'verdi, giuseppe': 'Giuseppe Verdi',

  // Puccini
  puccini: 'Giacomo Puccini',
  'g. puccini': 'Giacomo Puccini',
  'giacomo puccini': 'Giacomo Puccini',
  'puccini, giacomo': 'Giacomo Puccini',

  // Grieg
  grieg: 'Edvard Grieg',
  'e. grieg': 'Edvard Grieg',
  'edvard grieg': 'Edvard Grieg',
  'grieg, edvard': 'Edvard Grieg',

  // Dvořák
  dvorak: 'Antonín Dvořák',
  dvořák: 'Antonín Dvořák',
  'a. dvorak': 'Antonín Dvořák',
  'a. dvořák': 'Antonín Dvořák',
  'antonin dvorak': 'Antonín Dvořák',
  'antonín dvořák': 'Antonín Dvořák',

  // ==========================================
  // MODERN ERA (1910-present)
  // ==========================================

  // Debussy
  debussy: 'Claude Debussy',
  'c. debussy': 'Claude Debussy',
  'claude debussy': 'Claude Debussy',
  'debussy, claude': 'Claude Debussy',

  // Ravel
  ravel: 'Maurice Ravel',
  'm. ravel': 'Maurice Ravel',
  'maurice ravel': 'Maurice Ravel',
  'ravel, maurice': 'Maurice Ravel',

  // Bartók
  bartók: 'Béla Bartók',
  bartok: 'Béla Bartók',
  'b. bartók': 'Béla Bartók',
  'b. bartok': 'Béla Bartók',
  'béla bartók': 'Béla Bartók',
  'bela bartok': 'Béla Bartók',
  'bartók béla': 'Béla Bartók', // Hungarian order

  // Prokofiev
  prokofiev: 'Sergei Prokofiev',
  's. prokofiev': 'Sergei Prokofiev',
  'sergei prokofiev': 'Sergei Prokofiev',
  'prokofiev, sergei': 'Sergei Prokofiev',
  прокофьев: 'Sergei Prokofiev', // Cyrillic

  // Shostakovich
  shostakovich: 'Dmitri Shostakovich',
  'd. shostakovich': 'Dmitri Shostakovich',
  'dmitri shostakovich': 'Dmitri Shostakovich',
  'shostakovich, dmitri': 'Dmitri Shostakovich',
  шостакович: 'Dmitri Shostakovich', // Cyrillic

  // Stravinsky
  stravinsky: 'Igor Stravinsky',
  'i. stravinsky': 'Igor Stravinsky',
  'igor stravinsky': 'Igor Stravinsky',
  'stravinsky, igor': 'Igor Stravinsky',
  стравинский: 'Igor Stravinsky', // Cyrillic

  // Gershwin
  gershwin: 'George Gershwin',
  'g. gershwin': 'George Gershwin',
  'george gershwin': 'George Gershwin',
  'gershwin, george': 'George Gershwin',

  // Satie
  satie: 'Erik Satie',
  'e. satie': 'Erik Satie',
  'erik satie': 'Erik Satie',
  'satie, erik': 'Erik Satie',

  // ==========================================
  // GUITAR COMPOSERS
  // ==========================================

  sor: 'Fernando Sor',
  'f. sor': 'Fernando Sor',
  'fernando sor': 'Fernando Sor',
  'sor, fernando': 'Fernando Sor',

  'villa-lobos': 'Heitor Villa-Lobos',
  'h. villa-lobos': 'Heitor Villa-Lobos',
  'heitor villa-lobos': 'Heitor Villa-Lobos',
  'villa-lobos, heitor': 'Heitor Villa-Lobos',

  tarrega: 'Francisco Tárrega',
  tárrega: 'Francisco Tárrega',
  'f. tarrega': 'Francisco Tárrega',
  'f. tárrega': 'Francisco Tárrega',
  'francisco tarrega': 'Francisco Tárrega',
  'francisco tárrega': 'Francisco Tárrega',
  'tárrega, francisco': 'Francisco Tárrega',

  giuliani: 'Mauro Giuliani',
  'm. giuliani': 'Mauro Giuliani',
  'mauro giuliani': 'Mauro Giuliani',
  'giuliani, mauro': 'Mauro Giuliani',

  carcassi: 'Matteo Carcassi',
  'm. carcassi': 'Matteo Carcassi',
  'matteo carcassi': 'Matteo Carcassi',
  'carcassi, matteo': 'Matteo Carcassi',

  barrios: 'Agustín Barrios',
  'a. barrios': 'Agustín Barrios',
  'agustin barrios': 'Agustín Barrios',
  'agustín barrios': 'Agustín Barrios',
  'barrios mangoré': 'Agustín Barrios',
  'agustín barrios mangoré': 'Agustín Barrios',

  brouwer: 'Leo Brouwer',
  'l. brouwer': 'Leo Brouwer',
  'leo brouwer': 'Leo Brouwer',
  'brouwer, leo': 'Leo Brouwer',

  rodrigo: 'Joaquín Rodrigo',
  'j. rodrigo': 'Joaquín Rodrigo',
  'joaquin rodrigo': 'Joaquín Rodrigo',
  'joaquín rodrigo': 'Joaquín Rodrigo',
  'rodrigo, joaquín': 'Joaquín Rodrigo',

  // ==========================================
  // EDUCATIONAL COMPOSERS
  // ==========================================

  czerny: 'Carl Czerny',
  'c. czerny': 'Carl Czerny',
  'carl czerny': 'Carl Czerny',
  'czerny, carl': 'Carl Czerny',

  hanon: 'Charles-Louis Hanon',
  'c.l. hanon': 'Charles-Louis Hanon',
  'charles-louis hanon': 'Charles-Louis Hanon',
  'hanon, charles-louis': 'Charles-Louis Hanon',

  burgmüller: 'Friedrich Burgmüller',
  burgmuller: 'Friedrich Burgmüller',
  'f. burgmüller': 'Friedrich Burgmüller',
  'f. burgmuller': 'Friedrich Burgmüller',
  'friedrich burgmüller': 'Friedrich Burgmüller',
  'friedrich burgmuller': 'Friedrich Burgmüller',

  kabalevsky: 'Dmitri Kabalevsky',
  'd. kabalevsky': 'Dmitri Kabalevsky',
  'dmitri kabalevsky': 'Dmitri Kabalevsky',
  'kabalevsky, dmitri': 'Dmitri Kabalevsky',

  suzuki: 'Shinichi Suzuki',
  's. suzuki': 'Shinichi Suzuki',
  'shinichi suzuki': 'Shinichi Suzuki',

  // ==========================================
  // TRADITIONAL & SPECIAL CATEGORIES
  // ==========================================

  traditional: 'Traditional',
  trad: 'Traditional',
  'trad.': 'Traditional',
  folk: 'Traditional',
  'folk song': 'Traditional',
  folksong: 'Traditional',

  anonymous: 'Anonymous',
  anon: 'Anonymous',
  'anon.': 'Anonymous',
  unknown: 'Unknown',
  'composer unknown': 'Unknown',

  various: 'Various Artists',
  'various artists': 'Various Artists',
  'v.a.': 'Various Artists',
  compilation: 'Various Artists',

  // ==========================================
  // JAZZ & POPULAR COMPOSERS
  // ==========================================

  joplin: 'Scott Joplin',
  's. joplin': 'Scott Joplin',
  'scott joplin': 'Scott Joplin',

  ellington: 'Duke Ellington',
  'd. ellington': 'Duke Ellington',
  'duke ellington': 'Duke Ellington',

  porter: 'Cole Porter',
  'c. porter': 'Cole Porter',
  'cole porter': 'Cole Porter',

  kern: 'Jerome Kern',
  'j. kern': 'Jerome Kern',
  'jerome kern': 'Jerome Kern',

  berlin: 'Irving Berlin',
  'i. berlin': 'Irving Berlin',
  'irving berlin': 'Irving Berlin',

  // ==========================================
  // FILM & CONTEMPORARY COMPOSERS
  // ==========================================

  williams: 'John Williams',
  'j. williams': 'John Williams',
  'john williams': 'John Williams',

  zimmer: 'Hans Zimmer',
  'h. zimmer': 'Hans Zimmer',
  'hans zimmer': 'Hans Zimmer',

  horner: 'James Horner',
  'j. horner': 'James Horner',
  'james horner': 'James Horner',

  glass: 'Philip Glass',
  'p. glass': 'Philip Glass',
  'philip glass': 'Philip Glass',

  reich: 'Steve Reich',
  's. reich': 'Steve Reich',
  'steve reich': 'Steve Reich',

  pärt: 'Arvo Pärt',
  part: 'Arvo Pärt',
  'a. pärt': 'Arvo Pärt',
  'a. part': 'Arvo Pärt',
  'arvo pärt': 'Arvo Pärt',
  'arvo part': 'Arvo Pärt',
}

/**
 * Patterns to detect catalog numbers that shouldn't be in composer names
 * These are musical work catalog identifiers that sometimes get incorrectly
 * included in the composer field
 */
export const CATALOG_NUMBER_PATTERNS = [
  /BWV\s*\d+/gi, // Bach Works Catalog (BWV 772, etc.)
  /Op\.\s*\d+/gi, // Opus numbers (Op. 27, etc.)
  /K\.\s*\d+/gi, // Köchel catalog for Mozart (K. 331, etc.)
  /KV\s*\d+/gi, // Alternative Köchel notation
  /Hob\.\s*[IVX]+/gi, // Hoboken catalog for Haydn
  /D\.\s*\d+/gi, // Deutsch catalog for Schubert
  /S\.\s*\d+/gi, // Searle catalog for Liszt
  /WoO\s*\d+/gi, // Werk ohne Opuszahl (Work without Opus number)
  /RV\s*\d+/gi, // Ryom-Verzeichnis for Vivaldi
  /HWV\s*\d+/gi, // Händel-Werke-Verzeichnis for Handel
  /L\.\s*\d+/gi, // Kirkpatrick/Longo catalog for Scarlatti
  /No\.\s*\d+/gi, // Number designations (No. 1, etc.)
  /Sz\.\s*\d+/gi, // Szabó catalog for Bartók
  /BB\s*\d+/gi, // Bartók catalog alternative
  /Z\.\s*\d+/gi, // Zimmerman catalog for Purcell
  /P\.\s*\d+/gi, // Posthumous works
  /WD\s*\d+/gi, // Works of Doubtful authenticity
  /Anh\.\s*\d+/gi, // Anhang (appendix) numbers
]

/**
 * Special formatting cases for composer names
 * These particles and prefixes should be handled specially when capitalizing
 */
export const COMPOSER_NAME_PARTICLES = {
  // Particles that should be lowercase (except at start)
  lowercase: [
    'van',
    'von',
    'de',
    'della',
    'di',
    'da',
    'del',
    'dos',
    'das',
    'den',
    'der',
    'la',
    'le',
  ],

  // Initials that should be uppercase with periods
  initials: ['j.s.', 'c.p.e.', 'w.a.', 'l.v.', 'p.i.', 'g.f.', 'j.c.', 'c.l.'],
}
