/**
 * Landing-page “logs” strip — blog-shaped entries for `LandingContentSlide`.
 * Image URLs use FPO assets until final art exists.
 */
export type LandingBlogArticle = {
  image: string
  imageAlt: string
  title: string
  excerpt: string
  to: string
}

export const LANDING_BLOG_ARTICLES: LandingBlogArticle[] = [
  {
    image: '/images/landing/glaucus-blog-fpo-1.jpg',
    imageAlt: 'Diver reviewing course options next to open water',
    title: 'Choosing the right dive course',
    excerpt:
      'Match your goals, conditions, and schedule to an agency path—from discover scuba through advanced specialties.',
    to: '#choosing-right-dive-course'
  },
  {
    image: '/images/landing/glaucus-blog-fpo-2.jpg',
    imageAlt: 'Student diver preparing gear before a pool session',
    title: 'Preparing for your first dive',
    excerpt:
      'Paperwork, fitness and comfort in the water, what to pack, and how pool or confined water sets you up for success.',
    to: '#preparing-first-dive'
  },
  {
    image: '/images/landing/glaucus-blog-fpo-1.jpg',
    imageAlt: 'Open water certification celebration at the surface',
    title: 'How to obtain your first dive certification',
    excerpt:
      'Learn what it takes to earn your first certification so you can move confidently from class to open water dives.',
    to: '#first-dive-certification'
  },
  {
    image: '/images/landing/glaucus-blog-fpo-2.jpg',
    imageAlt: 'Rental BCD and regulator laid out for a dive trip',
    title: 'Understanding rental gear vs buying your own',
    excerpt:
      'When rentals make sense, what fit and hygiene matter for beginners, and sensible first purchases after certification.',
    to: '#rental-vs-own-gear'
  },
  {
    image: '/images/landing/glaucus-blog-fpo-1.jpg',
    imageAlt: 'Map and passport next to a dive log on a wooden table',
    title: 'Planning your first dive trip',
    excerpt:
      'Pick a destination and season, shortlist shops, align flights and insurance, and build a simple itinerary that stays flexible.',
    to: '#planning-first-dive-trip'
  }
]
