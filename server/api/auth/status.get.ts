import { editEnabled, isAuthenticated } from '../../utils/adminAuth'

export default defineEventHandler((event) => ({
  editEnabled: editEnabled(),
  authenticated: isAuthenticated(event),
}))
