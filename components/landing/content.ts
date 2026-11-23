// Contenido de la landing para estudiantes. Un solo origen para el texto visible y los datos estructurados (JSON-LD):
// lo que ve la persona es exactamente lo que lee el buscador.

export const USE_CASES = [
  {
    title: 'Deep reading & revision',
    genres: 'Ambient · Classical · Piano',
    text: 'Slow, instrumental tracks that stay in the background while you read, annotate and review your notes.',
  },
  {
    title: 'Problem sets & coding',
    genres: 'Lo-fi · Techno · Electronic',
    text: 'A steady rhythm for long, repetitive work like maths exercises, programming and flashcards.',
  },
  {
    title: 'Writing essays',
    genres: 'Jazz · Instrumental',
    text: 'Calm mixes without lyrics, so nothing competes with the words you are trying to write.',
  },
  {
    title: 'Late-night sessions',
    genres: 'Rain · Noise · Long ambient mixes',
    text: 'Hours-long mixes and soft noise to block out distractions during exam week.',
  },
];

export const FAQ = [
  {
    q: 'What is the best music for studying?',
    a: 'There is no single best choice, but instrumental music without lyrics, such as lo-fi, ambient, classical, jazz or soft electronic, tends to be less distracting when you read or write. Music4Study collects the tracks other students use so you can try them and keep what works for you.',
  },
  {
    q: 'What is Music4Study?',
    a: 'A library of study music. You save YouTube, Spotify and SoundCloud tracks, organize them by genre, group them in combinations for different kinds of study sessions and see what other students are listening to.',
  },
  {
    q: 'Which platforms does Music4Study support?',
    a: 'YouTube, Spotify and SoundCloud. Paste a link and Music4Study detects the platform and shows a preview before you save it.',
  },
  {
    q: 'How do I create my study library?',
    a: 'Sign in with Google, choose a username and start adding tracks. Each track gets a genre and a type, such as mix, song, video or set.',
  },
  {
    q: 'Can I make different playlists for different study sessions?',
    a: 'Yes. Combinations let you group tracks, for example one for deep reading and another for late-night problem sets.',
  },
] as const;

export const WHY = [
  {
    title: 'One page for your whole library',
    text: 'No more hopping between tabs. Every mix, album and set you rely on lives in a single page you can come back to.',
  },
  {
    title: 'Play several tracks at once',
    text: 'Layer a rain loop under a lo-fi mix, or a jazz set over brown noise. Start as many players as you like and they keep going together.',
  },
  {
    title: 'YouTube, Spotify and SoundCloud together',
    text: 'Use the platforms you already love in the same place, instead of having to choose just one of them.',
  },
  {
    title: 'Yours first, shared with students',
    text: 'Your library belongs to you. When you want ideas, see what other students are listening to.',
  },
] as const;
