import { assertAuth } from '../../utils/adminAuth'
import { writeConfig } from '../../utils/config'

export default defineEventHandler(async (event) => {
  assertAuth(event)
  writeConfig('bookmark-clicks.yaml', {})
  return { ok: true }
})
