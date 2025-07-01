import { getCollection, render, type CollectionEntry } from 'astro:content'
import { readingTime } from '@/lib/utils'

export async function getAllPosts(): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog')
  return posts
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
}

export async function getRecentPosts(
  count: number,
): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getAllPosts()
  return posts.slice(0, count)
}

export async function getAllAuthors(): Promise<CollectionEntry<'authors'>[]> {
  return await getCollection('authors')
}

export async function getAllProjects(): Promise<CollectionEntry<'projects'>[]> {
  const projects = await getCollection('projects')
  return projects.sort((a, b) => {
    const dateA = a.data.startDate?.getTime() || 0
    const dateB = b.data.startDate?.getTime() || 0
    return dateB - dateA
  })
}

export async function getAllTags(): Promise<Map<string, number>> {
  const posts = await getAllPosts()

  return posts.reduce((acc, post) => {
    post.data.tags?.forEach((tag) => {
      acc.set(tag, (acc.get(tag) || 0) + 1)
    })
    return acc
  }, new Map<string, number>())
}

export async function getSortedTags(): Promise<
  { tag: string; count: number }[]
> {
  const tagCounts = await getAllTags()

  return [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => {
      const countDiff = b.count - a.count
      return countDiff !== 0 ? countDiff : a.tag.localeCompare(b.tag)
    })
}

export function groupPostsByYear(
  posts: CollectionEntry<'blog'>[],
): Record<string, CollectionEntry<'blog'>[]> {
  return posts.reduce(
    (acc: Record<string, CollectionEntry<'blog'>[]>, post) => {
      const year = post.data.date.getFullYear().toString()
      ;(acc[year] ??= []).push(post)
      return acc
    },
    {},
  )
}

export async function parseAuthors(authorIds: string[] = []) {
  if (!authorIds.length) return []

  const allAuthors = await getAllAuthors()
  const authorMap = new Map(allAuthors.map((author) => [author.id, author]))

  return authorIds.map((id) => {
    const author = authorMap.get(id)

    return {
      id,
      name: author?.data?.name || id,
      avatar: author?.data?.avatar || '/static/logo.png',
      isRegistered: !!author,
    }
  })
}

export async function getPostsByAuthor(
  authorId: string,
): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getAllPosts()
  return posts.filter((post) => post.data.authors?.includes(authorId))
}

export async function getPostsByTag(
  tag: string,
): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getAllPosts()
  return posts.filter((post) => post.data.tags?.includes(tag))
}

// Subpost helper functions
export function isSubpost(postId: string): boolean {
  return postId.includes('/')
}

export function getParentId(postId: string): string {
  if (!isSubpost(postId)) return postId
  return postId.split('/')[0]
}

export async function getPostById(
  postId: string,
): Promise<CollectionEntry<'blog'> | undefined> {
  const posts = await getCollection('blog')
  return posts.find((post) => post.id === postId && !post.data.draft)
}

export async function getParentPost(
  postId: string,
): Promise<CollectionEntry<'blog'> | null> {
  if (!isSubpost(postId)) return null
  const parentId = getParentId(postId)
  return (await getPostById(parentId)) || null
}

export async function hasSubposts(postId: string): Promise<boolean> {
  const posts = await getCollection('blog')
  return posts.some((post) => 
    !post.data.draft &&
    isSubpost(post.id) && 
    getParentId(post.id) === postId
  )
}

export async function getSubpostCount(postId: string): Promise<number> {
  const posts = await getCollection('blog')
  return posts.filter((post) => 
    !post.data.draft &&
    isSubpost(post.id) && 
    getParentId(post.id) === postId
  ).length
}

export async function getAllPostsAndSubposts(): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog')
  return posts
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
}

export async function getAdjacentPosts(currentId: string): Promise<{
  prev: CollectionEntry<'blog'> | null
  next: CollectionEntry<'blog'> | null
}> {
  const isCurrentSubpost = isSubpost(currentId)
  
  if (isCurrentSubpost) {
    const parentId = getParentId(currentId)
    const allPosts = await getCollection('blog')
    const subposts = allPosts
      .filter((post) =>
        !post.data.draft &&
        isSubpost(post.id) &&
        getParentId(post.id) === parentId
      )
      .sort((a, b) => {
        const dateDiff = a.data.date.valueOf() - b.data.date.valueOf()
        if (dateDiff !== 0) return dateDiff

        const orderA = a.data.order ?? 0
        const orderB = b.data.order ?? 0
        return orderA - orderB
      })

    const currentIndex = subposts.findIndex((post) => post.id === currentId)
    if (currentIndex === -1) {
      return { prev: null, next: null }
    }

    return {
      next: currentIndex < subposts.length - 1 ? subposts[currentIndex + 1] : null,
      prev: currentIndex > 0 ? subposts[currentIndex - 1] : null,
    }
  } else {
    const posts = await getAllPosts()
    const nonSubposts = posts.filter((post) => !isSubpost(post.id))
    const currentIndex = nonSubposts.findIndex((post) => post.id === currentId)

    if (currentIndex === -1) {
      return { prev: null, next: null }
    }

    return {
      next: currentIndex > 0 ? nonSubposts[currentIndex - 1] : null,
      prev: currentIndex < nonSubposts.length - 1 ? nonSubposts[currentIndex + 1] : null,
    }
  }
}

export async function getSubpostsForParent(
  parentId: string,
): Promise<CollectionEntry<'blog'>[]> {
  const allPosts = await getCollection('blog')
  return allPosts
    .filter((post) =>
      !post.data.draft &&
      isSubpost(post.id) &&
      getParentId(post.id) === parentId,
    )
    .sort((a, b) => {
      const dateDiff = a.data.date.valueOf() - b.data.date.valueOf()
      if (dateDiff !== 0) return dateDiff

      const orderA = a.data.order ?? 0
      const orderB = b.data.order ?? 0
      return orderA - orderB
    })
}

export async function getPostReadingTime(postId: string): Promise<string> {
  const post = await getPostById(postId)
  if (!post || !post.body) return '0 min read'
  
  return readingTime(post.body)
}

export async function getCombinedReadingTime(parentId: string): Promise<string> {
  const parentPost = await getPostById(parentId)
  const subposts = await getSubpostsForParent(parentId)
  
  let combinedBody = ''
  
  if (parentPost?.body) {
    combinedBody += parentPost.body
  }
  
  for (const subpost of subposts) {
    if (subpost.body) {
      combinedBody += ' ' + subpost.body
    }
  }
  
  return readingTime(combinedBody || '')
}

export type TOCHeading = {
  slug: string
  text: string
  depth: number
  isSubpostTitle?: boolean
}

export type TOCSection = {
  type: 'parent' | 'subpost'
  title: string
  headings: TOCHeading[]
  subpostId?: string
}

export async function getTOCSections(postId: string): Promise<TOCSection[]> {
  const post = await getPostById(postId)
  if (!post) return []

  const parentId = isSubpost(postId) ? getParentId(postId) : postId
  const parentPost = isSubpost(postId) ? await getPostById(parentId) : post

  if (!parentPost) return []

  const sections: TOCSection[] = []

  const { headings: parentHeadings } = await render(parentPost)
  if (parentHeadings.length > 0) {
    sections.push({
      type: 'parent',
      title: 'Overview',
      headings: parentHeadings.map((heading) => ({
        slug: heading.slug,
        text: heading.text,
        depth: heading.depth,
      })),
    })
  }

  const subposts = await getSubpostsForParent(parentId)
  for (const subpost of subposts) {
    const { headings: subpostHeadings } = await render(subpost)
    if (subpostHeadings.length > 0) {
      sections.push({
        type: 'subpost',
        title: subpost.data.title,
        headings: subpostHeadings.map((heading, index) => ({
          slug: heading.slug,
          text: heading.text,
          depth: heading.depth,
          isSubpostTitle: index === 0,
        })),
        subpostId: subpost.id,
      })
    }
  }

  return sections
}
