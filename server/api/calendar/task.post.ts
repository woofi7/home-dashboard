import { getGoogleCreds, getGoogleAccessToken } from '../../utils/googleToken'

type Body = { listId?: string; taskId?: string }

export default defineEventHandler(async (event) => {
  const { listId, taskId } = await readBody<Body>(event)
  if (!listId || !taskId)
    throw createError({ statusCode: 400, message: 'listId and taskId are required' })

  const creds = getGoogleCreds()
  if (!creds)
    throw createError({ statusCode: 400, message: 'Google account not connected' })

  const token = await getGoogleAccessToken(creds)

  try {
    await $fetch(`https://www.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: { status: 'completed' },
    })
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number }; status?: number })?.response?.status ?? (err as { status?: number })?.status
    if (status === 403 || status === 401)
      throw createError({ statusCode: 403, message: 'Reconnect your Google account to grant Tasks write access.' })
    throw createError({ statusCode: 502, message: 'Could not complete the task.' })
  }

  return { ok: true }
})
