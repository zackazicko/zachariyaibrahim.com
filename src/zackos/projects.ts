export interface ProjectLink {
  label: string
  href: string
}

export interface ProjectMedia {
  type: 'image' | 'video'
  src: string
  alt: string
  poster?: string
  caption?: string
}

export interface ProjectEntry {
  slug: string
  title: string
  subtitle: string
  year?: string
  platform?: string
  role?: string
  previewSrc?: string
  previewFit?: 'cover' | 'contain'
  previewShape?: 'portrait' | 'square'
  summary: string
  description: string[]
  links: ProjectLink[]
  media: ProjectMedia[]
}

export const PROJECTS: ProjectEntry[] = [
  {
    slug: 'ftns',
    title: 'ftns.',
    subtitle: 'Fitness tracking, simplified',
    platform: 'iOS',
    previewFit: 'cover',
    previewShape: 'portrait',
    summary: 'ftns. is a fitness tracking app that aims to simplify workout entry and tracking.',
    description: [
      'ftns. is a fitness tracking app that aims to simplify workout entry and tracking. It distills the experience of a "fitness" tracker app" into the simplest form possible. Download it via the link below and give me some feedback. I built this app with deep focus on the user experience; removing every unnecessary click and friction between the user and the end goal of tracking exercises. It is built to be easier than logging a workout into your notes app, but provide historical data and insights to enable you to see progress and continuously improve. ftns. solves a very specific painpoint I have exprienced in my years at the gym, I do not want to carry around a notebook and pen (too analog), I do not want an AI slop workout app (don\'t tell me what to lift today), and I do not want to put workouts into my notes app (no insights over time).'
    ],
    links: [
      {
        label: 'App Store',
        href: 'https://apps.apple.com/us/app/ftns/id6756637536'
      }
    ],
    media: [
      {
        type: 'image',
        src: '/projects/ftns/01-home.jpg',
        alt: 'ftns. workout logging screen with sets, reps, and weight entry.'
      },
      {
        type: 'image',
        src: '/projects/ftns/02-insights.jpg',
        alt: 'ftns. insights screen showing search, filters, and exercise history cards.'
      },
      {
        type: 'image',
        src: '/projects/ftns/03-graphs.jpg',
        alt: 'ftns. graph view for a tricep extension exercise over time.'
      }
    ]
  },
  {
    slug: 'nts',
    title: 'nts.',
    subtitle: 'Simple, intelligent note-taking.',
    platform: 'Web + Mobile',
    previewSrc: '/projects/nts/logo.png',
    previewFit: 'contain',
    previewShape: 'square',
    summary: 'nts. is a notes app I created in mid-2025.',
    description: [
      'nts. is a notes app I created in mid-2025. It cleanly solves a problem I have; I take so many random notes on wildly different subjects and ideas and I have no way to recall these notes once they\'re created. Sometimes I have an idea for a cool product (everyone has a million of those in their notes app), or just something I need to get to at work. I write these quick thoughts in my native notes app and after a few months I have lost the ability to recall an idea I had on a specific subject.',
      'nts. uses a lightweight LLM that is prompted to parse and "tag" notes based on their content. This agent creates JSON tags and references old tags to understand if this note relates to any other topics, and what new topics this note contains. It is conceptually a very simple app, and was my first successful attempt at launching a usable app that my friends and colleagues could use.',
      'I initially deployed the website with Vercel, use Gemini as my API provider, and Supabase as the database, but I have since migrated everything to Cloudflare and created the subdomain nts.zachariyaibrahim.com.',
      'Feel free to use nts. to take your notes, it is super clean on both web and mobile, and gets more useful as you fill it with notes.',
      'My goal is to turn it into a mobile app eventually... when I have the time.'
    ],
    links: [
      {
        label: 'Open nts.',
        href: 'https://nts.zachariyaibrahim.com'
      }
    ],
    media: [
      {
        type: 'image',
        src: '/projects/nts/01-homepage.png',
        alt: 'nts. homepage with minimalist dark landing screen.'
      },
      {
        type: 'image',
        src: '/projects/nts/02-notes-page.png',
        alt: 'nts. notes list and tag sidebar view on desktop.'
      },
      {
        type: 'image',
        src: '/projects/nts/03-editor.png',
        alt: 'nts. rich text note editor view.'
      },
      {
        type: 'image',
        src: '/projects/nts/04-search.png',
        alt: 'nts. search results interface showing note and tag matches.'
      },
      {
        type: 'image',
        src: '/projects/nts/05-mobile.png',
        alt: 'nts. mobile notes interface.'
      }
    ]
  }
]
