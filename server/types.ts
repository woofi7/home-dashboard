export type Bookmark = { name: string; url: string; icon?: string }
export type BookmarkGroup = { name: string; bookmarks: Bookmark[]; layout?: unknown }

export type Service = { name: string; url?: string; icon?: string; type?: string; [key: string]: unknown }
export type ServiceGroup = { name: string; services: Service[]; layout?: unknown }
