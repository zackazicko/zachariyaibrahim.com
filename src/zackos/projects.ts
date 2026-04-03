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
  previewShape?: 'portrait' | 'square' | 'landscape'
  summary: string
  description: string[]
  links: ProjectLink[]
  media: ProjectMedia[]
}

export const PROJECTS: ProjectEntry[] = [
  {
    slug: 'fjr',
    title: 'fjr',
    subtitle: 'Fajr alarm, relative to dawn',
    platform: 'iOS (Swift)',
    previewSrc: '/projects/fjr/logo.png',
    previewFit: 'contain',
    previewShape: 'square',
    summary:
      'A Swift iOS app that sets your wake-up alarm from plain language—minutes before or after Fajr or sunrise—using Apple’s AlarmKit.',
    description: [
      'I spent 72 hours building fjr to save myself about 45 seconds every night. The problem it solves for me and my Muslim peers is that Fajr prayer time changes every day because it tracks the appearance of dawn. Muslims have to wake up to catch this prayer before sunrise, so they set a fresh alarm every night so they do not miss Fajr. My nightly routine was to check the Fajr and sunrise times, set an alarm somewhere between those two depending on when I wanted to wake up, and hope I did not forget or mess up. Some days that was 10 minutes before Fajr, other days 15 minutes before sunrise.',
      'That caused a few issues. First, my alarm app filled up with random minute-increment alarms, which made the app feel cluttered and defeated the point of saving alarm presets. Second, if I forgot to set my Fajr alarm I would miss the prayer—not good. Finally, the mental math got annoying, especially in Ramadan when I was waking up before Fajr for my last sips of water.',
      'I knew this could be solved because Apple released AlarmKit at WWDC25, letting developers use iOS’ native alarm screen and break through Focus modes (DND, Sleep, and so on). In 2026 I sketched the solution I wanted and used it as a reason to get comfortable building Swift apps with Claude Code.',
      'The shipped result is, in my view, a very sleek UX for the problem. Users configure alarms by tapping the “Wake me up x minutes before/after Fajr/sunrise” sentence; the alarm updates automatically. They always know when they are waking up relative to Fajr and can change behavior through a sentence that stays easy to understand.',
    ],
    links: [],
    media: [
      {
        type: 'image',
        src: '/projects/fjr/01.jpg',
        alt: 'fjr main screen with wake time sentence and Fajr-related alarm controls.',
      },
      {
        type: 'image',
        src: '/projects/fjr/02.jpg',
        alt: 'fjr interface showing prayer time context and alarm scheduling.',
      },
      {
        type: 'image',
        src: '/projects/fjr/03.jpg',
        alt: 'fjr screen highlighting minutes before or after Fajr or sunrise.',
      },
      {
        type: 'image',
        src: '/projects/fjr/04.jpg',
        alt: 'fjr additional view of the Fajr alarm experience on iPhone.',
      },
      {
        type: 'image',
        src: '/projects/fjr/05.jpg',
        alt: 'fjr App Store–style showcase of the alarm and timing flow.',
      },
    ],
  },
  {
    slug: 'ftns',
    title: 'ftns.',
    subtitle: 'Fitness tracking, simplified',
    platform: 'iOS',
    previewSrc: '/projects/ftns/logo.png',
    previewFit: 'contain',
    previewShape: 'square',
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
      'I initially deployed the website with Vercel, used Gemini as my API provider, and Supabase as the database but I have since migrated everything to Cloudflare and created the subdomain nts.zachariyaibrahim.com.',
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
  },
  {
    slug: 'cleary',
    title: 'cleary',
    subtitle: 'Drug research from public data sources.',
    platform: 'HTML Web App + Python Backend',
    previewSrc: '/projects/cleary/logo.png',
    previewFit: 'contain',
    previewShape: 'square',
    summary: 'Cleary is a personal research exploration.',
    description: [
      'Cleary is a personal research exploration. My goal was to understand which data sources are publicly available, and what less obvious things about drugs can be uncovered from a quick ping of these data sources.',
      'I began with a ChatGPT search to understand which FDA and research API\'s were free to use, looked into these resources, and used Cursor to build a barebones CLI interface where a user can input the name of a drug, get it normalized to an NDC (national drug code directory), and then see all of the payments paid by the manufacturer to shady sources, any open recalls, and peer reviewed studies on the drug. Users can also output this full data dump to a markdown file and plug it into their own LLM to get a better understanding of the drug they are taking.',
      'This is a proof of concept for a more thought out app I would like to build one day which takes this publicly available data and gives insights directly to patients looking to understand the medicine they were just prescribed.',
      'I was inspired to create this project after reading "No More Tears" by Gardiner Harris - what a book! This book covers some of the dirty secrets Johnson & Johnson has been attempting to hide and the shady business of drug manufacturers.'
    ],
    links: [
      {
        label: 'Try Cleary',
        href: 'https://cleary.zachariyaibrahim.com'
      }
    ],
    media: [
      {
        type: 'image',
        src: '/projects/cleary/01-search.png',
        alt: 'Cleary search interface for looking up a drug.'
      },
      {
        type: 'image',
        src: '/projects/cleary/02-financials.png',
        alt: 'Cleary financial view showing manufacturer payments and related data.'
      },
      {
        type: 'image',
        src: '/projects/cleary/03-ozempic.png',
        alt: 'Cleary drug detail page for Ozempic.'
      }
    ]
  }
]
