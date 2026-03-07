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
  }
]
