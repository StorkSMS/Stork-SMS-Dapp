export interface TrophyData {
  type: 'platinum' | 'gold' | 'silver' | 'bronze'
  count: number
  achieved: boolean
}

export interface Trophy {
  id: string
  title: string
  description: string
  threshold: number
  achieved: boolean
  type: 'platinum' | 'gold' | 'silver' | 'bronze'
  currentCount?: number
}

export interface TrophyStats {
  earlyAdopterCount: number
  onboarderCount: number
  chatterBoxCount: number
  fledglingCount: number
  tweeterCount: number
  stickerCollectorCount: number
  canYouHearMeCount: number
  lookAtThisCount: number
  futureMillionaireCount: number
  // Future trophy stats can be added here
}

export interface TrophyResponse {
  success: boolean
  stats: TrophyStats
  error?: string
}