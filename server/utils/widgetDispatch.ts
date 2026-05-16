import { fetchWidget, type WidgetResult } from './fetchWidget'
import { fetchUnraid } from '../api/widget/unraid.get'
import { fetchPortainer } from '../api/widget/portainer.get'
import { fetchDuplicati } from '../api/widget/duplicati.get'
import { fetchHomeAssistant } from '../api/widget/homeassistant.get'
import { fetchPihole } from '../api/widget/pihole.get'
import { fetchQbittorrent } from '../api/widget/qbittorrent.get'
import { fetchAudiobookshelf } from '../api/widget/audiobookshelf.get'

type Fetcher = (creds: Record<string, string>) => Promise<WidgetResult | null>

const DEDICATED: Record<string, Fetcher> = {
  unraid: fetchUnraid,
  portainer: fetchPortainer,
  duplicati: fetchDuplicati,
  homeassistant: fetchHomeAssistant,
  pihole: fetchPihole,
  qbittorrent: fetchQbittorrent,
  audiobookshelf: fetchAudiobookshelf,
}

export async function fetchWidgetForService(
  type: string,
  creds: Record<string, string>,
): Promise<WidgetResult | null> {
  const handler = DEDICATED[type] ?? fetchWidget.bind(null, type)
  return handler(creds).catch(() => null)
}
