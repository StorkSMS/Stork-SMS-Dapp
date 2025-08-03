'use client'

import NotificationSettings from '@/components/NotificationSettings'

export default function TestNotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Test Push Notifications</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>
          <NotificationSettings />
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Testing Steps:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Click "Enable Notifications" above</li>
            <li>Allow notifications when browser prompts</li>
            <li>Click "Send Test Notification" to verify it works</li>
            <li>Check the browser console for any errors</li>
          </ol>
        </div>

        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <p className="text-sm">Open browser DevTools (F12) to see console logs</p>
          <p className="text-sm mt-2">Check Application → Service Workers to verify firebase-messaging-sw.js is running</p>
        </div>
      </div>
    </div>
  )
}