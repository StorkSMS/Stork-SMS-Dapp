# Troubleshooting Guide

Solve common issues and get back to messaging quickly. This guide covers the most frequent problems and their solutions.

## Quick Fixes

### Try These First

Before diving into specific issues, try these common solutions:

1. **Refresh the Page**: Ctrl+F5 (or Cmd+Shift+R on Mac) for a hard refresh
2. **Check Network**: Ensure stable internet connection
3. **Wallet Connection**: Disconnect and reconnect your wallet
4. **Browser Update**: Use the latest version of Chrome or Firefox
5. **Clear Cache**: Clear browser cache and cookies for Stork SMS

### System Status Check

Before troubleshooting, check if the issue is system-wide:
- **Solana Network**: Visit [status.solana.com](https://status.solana.com)
- **Stork SMS Status**: Check our [Discord](https://discord.gg/storksms) for announcements
- **Your Wallet**: Verify wallet is working with other dApps

## Wallet Connection Issues

### Can't Connect Wallet

**Problem**: Wallet won't connect or shows connection error.

**Solutions**:

1. **Install/Update Wallet Extension**
   ```
   1. Go to wallet's official website
   2. Install or update the browser extension
   3. Restart your browser
   4. Try connecting again
   ```

2. **Grant Permissions**
   - Ensure Stork SMS is allowed in wallet settings
   - Check if wallet is unlocked
   - Look for permission prompts in wallet extension

3. **Check Network Settings**
   - Verify wallet is set to Solana Mainnet (or Devnet for testing)
   - Match network in wallet with Stork SMS network
   - Switch networks if they don't match

4. **Browser Issues**
   - Try incognito/private browsing mode
   - Disable other wallet extensions temporarily
   - Test with different browser

**Specific Wallet Troubleshooting**:

#### Phantom Wallet
- Check if extension is enabled for the site
- Look for Phantom icon in address bar
- Verify permissions in Settings > Connected Sites

#### Solflare Wallet
- Ensure you're using compatible browser
- Check network settings match Stork SMS
- Try both extension and web wallet versions

#### Ledger Hardware Wallet
- Connect device and unlock with PIN
- Open Solana app on Ledger device
- Enable "blind signing" in Solana app settings
- Use compatible browser (Chrome recommended)

### Wallet Disconnects Frequently

**Problem**: Wallet connection drops during use.

**Solutions**:
1. **Extension Settings**: Check if wallet has timeout settings
2. **Browser Sleep**: Prevent browser from sleeping/hibernating
3. **Network Stability**: Ensure stable internet connection
4. **Wallet Updates**: Update to latest wallet version

## Message Sending Problems

### Messages Won't Send

**Problem**: Messages appear stuck or fail to send.

**Troubleshooting Steps**:

1. **Check SOL Balance**
   ```
   Minimum Required: ~0.001 SOL for transaction fees
   Solution: Add SOL to your wallet
   ```

2. **Verify Chat Creation**
   - Ensure chat creation transaction completed
   - Check both NFTs were successfully minted
   - Verify recipient has access to chat

3. **Network Congestion**
   - Wait 1-2 minutes and try again
   - Check Solana network status
   - Try during less busy times

4. **Transaction Failure**
   - Look for error messages in wallet
   - Check transaction in Solana explorer
   - Increase priority fee if available

### Message Shows as Sending

**Problem**: Message stuck in "sending" state.

**Solutions**:
1. **Wait**: Solana transactions can take 30-60 seconds
2. **Check Explorer**: Look up transaction signature
3. **Refresh**: Reload page if stuck for >2 minutes
4. **Resend**: Try sending message again

### Recipient Can't See Messages

**Problem**: You can send but recipient doesn't receive.

**Checklist**:
- ✅ Recipient owns the correct NFT
- ✅ Recipient's wallet is connected
- ✅ Chat was created properly
- ✅ Both parties on same network (Mainnet/Devnet)

**Solutions**:
1. **NFT Verification**: Have recipient check NFT ownership
2. **Network Match**: Verify both using same Solana network
3. **Chat Refresh**: Both parties refresh their chat
4. **Re-create Chat**: If persistent, create new chat

## Chat Loading Issues

### Chats Won't Load

**Problem**: Chat list appears empty or won't load.

**Diagnostic Steps**:

1. **Wallet Connected**: Verify wallet is properly connected
2. **Network Status**: Check Solana network health
3. **NFT Ownership**: Confirm you own chat NFTs
4. **Database Sync**: May need time to sync after network issues

**Solutions**:
```
1. Disconnect and reconnect wallet
2. Clear browser cache for Stork SMS
3. Wait 5 minutes and try again
4. Check wallet on different device/browser
```

### Old Messages Missing

**Problem**: Chat loads but missing message history.

**Possible Causes**:
- Database sync issues
- Network interruption during load
- Browser cache corruption

**Solutions**:
1. **Hard Refresh**: Ctrl+Shift+R (or Cmd+Shift+R)
2. **Clear Storage**: Clear browser data for Stork SMS
3. **Wait and Retry**: Database may need time to sync
4. **Different Browser**: Test with another browser

### Chat Performance Issues

**Problem**: Chats load slowly or lag.

**Performance Optimization**:
1. **Browser Choice**: Use Chrome or Firefox
2. **Close Tabs**: Reduce browser memory usage
3. **Disable Extensions**: Turn off unnecessary extensions
4. **Check Hardware**: Ensure adequate RAM and CPU

## NFT and Blockchain Issues

### NFT Creation Failed

**Problem**: Can't create chat due to NFT creation failure.

**Troubleshooting**:

1. **Insufficient Funds**
   ```
   Check Balance: Need ~0.002 SOL minimum
   Solution: Add SOL to wallet
   Where to Buy: Coinbase, Binance, or DEX
   ```

2. **Network Congestion**
   - Try during off-peak hours
   - Increase priority fee if wallet supports it
   - Wait and retry after 5-10 minutes

3. **Transaction Limits**
   - Some wallets have daily limits
   - Check wallet settings and limits
   - Try smaller transaction first

### NFT Ownership Issues

**Problem**: System says you don't own required NFT.

**Verification Steps**:
1. **Check Wallet**: Verify NFT is in connected wallet
2. **Network Match**: Ensure wallet on correct network
3. **Recent Transfer**: Wait 1-2 minutes after receiving NFT
4. **Multiple Wallets**: Check if NFT is in different wallet

**Solutions**:
- Refresh page and reconnect wallet
- Verify NFT ownership on Solana explorer
- Contact support with wallet address and NFT mint

### Transaction Stuck

**Problem**: Blockchain transaction won't complete.

**Understanding Transaction States**:
- **Pending**: Submitted to network, waiting confirmation
- **Confirmed**: Successfully processed
- **Failed**: Rejected by network

**Solutions for Stuck Transactions**:
1. **Wait**: Most resolve within 5 minutes
2. **Check Explorer**: Look up transaction signature
3. **Retry**: Try the action again with higher fee
4. **Contact Support**: If stuck for >30 minutes

## File Upload Problems

### Images Won't Upload

**Problem**: Image upload fails or takes too long.

**File Requirements**:
- **Maximum Size**: 10MB per image
- **Supported Formats**: JPG, PNG, WebP, GIF
- **Internet**: Stable connection required

**Solutions**:
1. **Resize Image**: Reduce file size if >10MB
2. **Format Check**: Ensure supported format
3. **Network Test**: Try uploading smaller file first
4. **Browser Refresh**: Clear and retry

### Voice Messages Not Working

**Problem**: Can't record or send voice messages.

**Permission Check**:
1. **Microphone Access**: Grant microphone permissions
2. **Browser Settings**: Check site permissions
3. **Hardware Test**: Test microphone in other apps

**Recording Issues**:
- **Hold Button**: Must hold record button continuously
- **Time Limit**: Maximum 2 minutes per voice message
- **Background Apps**: Close other apps using microphone

## Real-time Features Issues

### Typing Indicators Not Showing

**Problem**: Can't see when others are typing.

**Requirements**:
- Both users must be online
- Chat must be actively open
- WebSocket connection must be stable

**Solutions**:
1. **Refresh Connection**: Refresh page for both users
2. **Network Check**: Ensure stable internet
3. **Browser Update**: Use latest browser version

### Messages Not Updating Live

**Problem**: Need to refresh to see new messages.

**Real-time Troubleshooting**:
1. **WebSocket Connection**: Check browser console for errors
2. **Network Issues**: Test with different internet connection
3. **Browser Compatibility**: Try Chrome or Firefox
4. **Firewall/Proxy**: May block WebSocket connections

## Performance Issues

### App Running Slowly

**Problem**: Stork SMS feels sluggish or unresponsive.

**Performance Optimization**:

1. **Browser Resources**
   ```
   Close unnecessary tabs
   Restart browser periodically
   Clear cache and cookies
   Update to latest browser version
   ```

2. **Hardware Check**
   - Ensure adequate RAM (4GB+ recommended)
   - Check CPU usage in task manager
   - Close resource-heavy applications

3. **Network Optimization**
   - Use wired connection if possible
   - Test internet speed (10Mbps+ recommended)
   - Close streaming or download applications

### High CPU Usage

**Problem**: Browser using too much CPU.

**Solutions**:
1. **Close Other Tabs**: Reduce browser load
2. **Disable Extensions**: Turn off unnecessary extensions
3. **Check Background Apps**: Close unused applications
4. **Browser Restart**: Fresh start often helps

## Error Messages

### "Transaction Failed" Errors

**Common Causes and Solutions**:

1. **Insufficient Funds**
   ```
   Error: "Insufficient funds"
   Solution: Add more SOL to wallet
   ```

2. **Network Error**
   ```
   Error: "Network request failed"
   Solution: Check internet connection, try again
   ```

3. **Invalid Transaction**
   ```
   Error: "Transaction simulation failed"
   Solution: Check wallet settings, try lower amount
   ```

### "Access Denied" Errors

**NFT Access Issues**:
1. **Check NFT Ownership**: Verify you own required NFT
2. **Wallet Verification**: Ensure correct wallet connected
3. **Network Mismatch**: Check wallet network settings

### "Connection Error" Messages

**WebSocket/API Issues**:
1. **Refresh Page**: Simple refresh often fixes connection issues
2. **Check Firewall**: Ensure Stork SMS isn't blocked
3. **Try Different Network**: Test with mobile hotspot
4. **Browser Reset**: Clear all data and try again

## Mobile-Specific Issues

### Mobile Wallet Connection

**Problem**: Wallet won't connect on mobile browser.

**Mobile Solutions**:
1. **Use Wallet Browser**: Open Stork SMS in wallet's built-in browser
2. **Deep Links**: Try wallet's dApp browser feature
3. **Desktop Alternative**: Use desktop for complex operations

### Touch/Tap Issues

**Problem**: Buttons don't respond to taps.

**Solutions**:
1. **Zoom Level**: Ensure page isn't zoomed in/out
2. **Browser Choice**: Try different mobile browser
3. **Screen Calibration**: Check touch screen responsiveness

## Advanced Troubleshooting

### Browser Console Debugging

**For Technical Users**:

1. **Open Console**: F12 or right-click > Inspect > Console
2. **Look for Errors**: Red error messages indicate issues
3. **Common Patterns**:
   ```
   WebSocket errors: Real-time connection issues
   CORS errors: Network/browser security issues
   Wallet errors: Connection or permission problems
   ```

### Network Tab Analysis

**Check Network Issues**:
1. **Failed Requests**: Look for red/failed network requests
2. **Slow Responses**: Identify performance bottlenecks
3. **WebSocket Status**: Verify real-time connections

### Local Storage Issues

**Clear Application Data**:
1. **Developer Tools**: F12 > Application tab
2. **Clear Storage**: Clear all data for Stork SMS
3. **Reload**: Refresh page after clearing

## When to Contact Support

### Contact Support If:
- Issue persists after trying all solutions
- Error involves potential security concerns
- You've lost access to important chats
- System appears to be malfunctioning

### Support Information to Include:
1. **Wallet Address**: Your public key (never private key)
2. **Browser/OS**: Chrome v120 on Windows 11, etc.
3. **Error Messages**: Screenshots of any errors
4. **Steps to Reproduce**: What you did before the issue
5. **Transaction Signatures**: If blockchain-related

### Support Channels:
- **Discord**: [discord.gg/storksms](https://discord.gg/storksms) (fastest)
- **Email**: [info@stork-sms.net](mailto:info@stork-sms.net)
- **Twitter**: [@StorkSMS](https://twitter.com/storksms)

## Prevention Tips

### Best Practices to Avoid Issues:

1. **Regular Updates**: Keep wallet and browser updated
2. **Backup Wallet**: Always have recovery phrase backed up
3. **Stable Internet**: Use reliable internet connection
4. **Resource Management**: Don't overload browser with tabs
5. **Network Consistency**: Stay on same network (Mainnet/Devnet)

### Maintenance Routine:
- Weekly browser cache clearing
- Monthly wallet extension updates
- Regular backup verification
- Monitor SOL balance for fees

### Security Practices:
- Never share private keys
- Verify URLs before connecting wallet
- Use hardware wallets for large amounts
- Be cautious with browser extensions

---

**Still having issues?** Our community and support team are here to help! Join our [Discord](https://discord.gg/storksms) for real-time assistance.

