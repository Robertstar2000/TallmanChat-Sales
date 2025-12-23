# Retry Mechanism with Detailed Error Reporting

## Implementation

### Configuration
```typescript
const MAX_RETRIES = 2; // Retry failed operations twice
```

### How It Works

1. **First Attempt**: Message sent normally
2. **Retry 1**: If fails, wait 1 second and retry
3. **Retry 2**: If fails again, wait 2 seconds and retry
4. **Final Failure**: After 3 total attempts, show detailed error

### Retry Flow

```
User sends message
    ↓
Attempt 1 (immediate)
    ↓
[FAIL] → Wait 1s → Attempt 2 (retry 1)
    ↓
[FAIL] → Wait 2s → Attempt 3 (retry 2)
    ↓
[FAIL] → Show detailed error report
```

### Exponential Backoff
- Retry 1: Wait 1 second
- Retry 2: Wait 2 seconds
- Formula: `1000ms * retryCount`

## Detailed Error Report

When all retries fail, users see:

```
Failed after 2 retries.

Error: [Original error message]

Details:
- Attempt 1: Failed
- Attempt 2: Failed (retry 1)
- Attempt 3: Failed (retry 2)

Possible causes:
- Ollama service not running
- Network connectivity issues
- Model not loaded
- Message too complex

Please check:
1. Ollama is running (check Admin Panel > Test Connection)
2. Model 'llama3.2' is installed
3. Network connection is stable
4. Try a simpler message
```

## Error Logging

Console logs include:
```javascript
{
  originalError: Error object,
  retries: 2,
  messageLength: 150,
  attachmentCount: 0,
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

## Safety Features

### Never Crashes
- All errors caught in try-catch
- Error boundary as final safety net
- User message preserved in history
- App remains functional after error

### User Feedback
- Loading indicator during retries
- Clear error messages
- Actionable troubleshooting steps
- No technical jargon

### Automatic Recovery
- Retry count resets for each new message
- No state pollution between messages
- Clean error state management

## Example Scenarios

### Scenario 1: Temporary Network Glitch
```
Attempt 1: Network timeout
Wait 1s...
Attempt 2: Success ✓
```
**Result**: Message sent successfully, user unaware of retry

### Scenario 2: Ollama Not Running
```
Attempt 1: Connection refused
Wait 1s...
Attempt 2: Connection refused
Wait 2s...
Attempt 3: Connection refused
```
**Result**: Detailed error shown with troubleshooting steps

### Scenario 3: Model Not Loaded
```
Attempt 1: Model not found
Wait 1s...
Attempt 2: Model not found
Wait 2s...
Attempt 3: Model not found
```
**Result**: Error report suggests checking model installation

## Configuration Options

### Adjust Retry Count
```typescript
// In hooks/useChat.ts
const MAX_RETRIES = 2; // Change to 1, 3, etc.
```

### Adjust Backoff Timing
```typescript
// Current: 1s, 2s, 3s...
await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));

// Faster: 500ms, 1s, 1.5s...
await new Promise(resolve => setTimeout(resolve, 500 * retryCount));

// Slower: 2s, 4s, 6s...
await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
```

## Testing

### Test Retry Success
1. Temporarily disconnect network
2. Send message (Attempt 1 fails)
3. Reconnect network quickly
4. Retry succeeds
5. **Expected**: Message sent, no error shown

### Test Retry Failure
1. Stop Ollama service
2. Send message
3. Wait for 3 attempts
4. **Expected**: Detailed error report shown
5. **Expected**: App still functional

### Test Error Recovery
1. Trigger error with retries
2. Fix issue (start Ollama)
3. Send new message
4. **Expected**: Works normally, retry count reset

## Benefits

### For Users
- ✅ Automatic recovery from temporary issues
- ✅ Clear error messages when problems persist
- ✅ Actionable troubleshooting steps
- ✅ No data loss (messages preserved)

### For Developers
- ✅ Detailed error logs
- ✅ Retry metrics tracked
- ✅ Easy to debug issues
- ✅ Configurable retry behavior

### For System
- ✅ Never crashes
- ✅ Graceful degradation
- ✅ Self-healing for transient errors
- ✅ Predictable behavior

## Monitoring

### What to Watch
- Retry frequency (high = underlying issue)
- Error patterns (same error repeatedly)
- Success rate after retries
- Time to recovery

### Red Flags
- All messages requiring retries
- Retries never succeeding
- Same error message repeatedly
- Increasing retry times

## Summary

The retry mechanism:
1. ✅ Retries failed operations 2 times
2. ✅ Uses exponential backoff (1s, 2s)
3. ✅ Shows detailed error after all retries fail
4. ✅ Never crashes the system
5. ✅ Preserves user data
6. ✅ Provides actionable feedback
7. ✅ Logs detailed error information
8. ✅ Resets cleanly for new messages
