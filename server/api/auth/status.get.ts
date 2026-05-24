import { tokenConfigured, isAuthenticated } from '../../utils/adminAuth'

export default defineEventHandler((event) => ({
  tokenConfigured: tokenConfigured(),
  editEnabled: tokenConfigured(),
  authenticated: isAuthenticated(event),
}))
