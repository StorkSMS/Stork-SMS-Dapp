// Wallet connection error handler utility
export function handleWalletConnectionError(error: any) {
  console.error("Wallet connection error:", error)
  
  // User cancelled - don't show error
  if (error?.message?.includes('User rejected') || 
      error?.message?.includes('cancelled') ||
      error?.message?.includes('user rejected') ||
      error?.code === 4001) {
    console.log("User cancelled wallet connection")
    return
  }
  
  // No wallet found - already handled by custom handler
  if (error?.message?.includes('No wallet found') || 
      error?.message?.includes('wallet not found')) {
    console.log("No wallet detected - handled by custom notification")
    return
  }
  
  // Wallet not ready
  if (error?.message?.includes('not ready') || 
      error?.message?.includes('wallet is not ready')) {
    showErrorNotification("Wallet not ready", "Please wait a moment and try again")
    return
  }
  
  // Network mismatch
  if (error?.message?.includes('network') || 
      error?.message?.includes('chain')) {
    showErrorNotification("Network mismatch", "Please check your wallet network")
    return
  }
  
  // Generic connection error
  showErrorNotification("Connection failed", "Please try again")
}

function showErrorNotification(title: string, message: string) {
  const notification = document.createElement('div')
  notification.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: 'Helvetica Neue', sans-serif;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      max-width: 320px;
    ">
      <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
      <div style="opacity: 0.9; font-size: 13px;">${message}</div>
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    </style>
  `
  document.body.appendChild(notification)
  
  // Remove after 4 seconds with animation
  setTimeout(() => {
    notification.firstElementChild?.setAttribute('style', 
      notification.firstElementChild.getAttribute('style') + '; animation: slideOut 0.3s ease-out forwards;'
    )
    setTimeout(() => notification.remove(), 300)
  }, 4000)
}