export type LessonMeta = {
  slug: string
  num: string
  title: string
  short: string
  blurb: string
  minutes: number
  accent: string
  skill: string
}

export const LESSONS: LessonMeta[] = [
  {
    slug: 'engine',
    num: '01',
    title: 'How an engine breathes',
    short: 'Engine',
    blurb: 'Watch one cylinder inhale, squeeze, bang and exhale, 20 times a second.',
    minutes: 6,
    accent: '#ff3d9a',
    skill: 'Understand the 4-stroke cycle',
  },
  {
    slug: 'under-the-hood',
    num: '02',
    title: 'The 5-minute hood check',
    short: 'Under the hood',
    blurb: 'Pop the hood and find the six things you can check yourself, no tools needed.',
    minutes: 8,
    accent: '#d6ff4f',
    skill: 'Check oil, coolant, washer fluid',
  },
  {
    slug: 'tires',
    num: '03',
    title: 'Read your tire like a pro',
    short: 'Tires',
    blurb: '205/55 R16 91V is not a password. Decode it, test your tread and nail the pressure.',
    minutes: 7,
    accent: '#7cc8ff',
    skill: 'Decode the sidewall',
  },
  {
    slug: 'brakes',
    num: '04',
    title: 'How one foot stops 1.4 tons',
    short: 'Brakes',
    blurb: 'Hold the pedal and watch fluid, pistons and pads turn speed into heat.',
    minutes: 5,
    accent: '#ffb547',
    skill: 'Know when brakes need help',
  },
  {
    slug: 'dashboard',
    num: '05',
    title: 'Decode your dashboard',
    short: 'Dashboard lights',
    blurb: 'Red, amber, green. Learn which lights mean “pull over” and which mean “whenever”.',
    minutes: 5,
    accent: '#a98bff',
    skill: 'Read every warning light',
  },
  {
    slug: 'flat-tire',
    num: '06',
    title: 'Change a flat. Yes, you.',
    short: 'Flat tire',
    blurb: 'Jack points, lug nuts, the star pattern. Practise it here before you need it.',
    minutes: 9,
    accent: '#4ee38f',
    skill: 'Swap to the spare safely',
  },
]

export const lessonBySlug = (slug: string) => LESSONS.find((l) => l.slug === slug)
export const nextLesson = (slug: string) => {
  const i = LESSONS.findIndex((l) => l.slug === slug)
  return LESSONS[(i + 1) % LESSONS.length]
}
