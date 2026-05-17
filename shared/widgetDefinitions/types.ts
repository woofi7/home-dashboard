export type AuthType = 'header' | 'bearer' | 'basic' | 'query' | 'password' | 'none'

export type WidgetField = { label: string; desc: string }

export type WidgetDefinition = {
  name: string
  authType: AuthType
  fields: readonly WidgetField[]
}
