export const getThemeColors = (isDarkMode: boolean) => ({
  bg: isDarkMode ? '#0E0E0E' : '#FFF',
  text: isDarkMode ? '#FFF' : '#000',
  border: isDarkMode ? '#FFF' : '#000',
  bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
  textSecondary: isDarkMode ? '#CCC' : '#666'
})

export const formatRelativeTime = (timestamp: string) => {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d`
  } else {
    return time.toLocaleDateString()
  }
}