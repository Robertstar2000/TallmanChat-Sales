# Internal Domain Setup for chat.tallman.com

## 1. DNS Configuration (Domain Controller)
```
On DC02.tallman.com:
- Zone: tallman.com
- A Record: chat -> 10.10.20.9
- No external access required
```

## 2. SSL Certificate
- Self-signed certificate for chat.tallman.com
- Installed in Local Machine certificate store
- Bound to IIS HTTPS binding

## 3. IIS Configuration
- Site: TallmanChat
- Bindings: 
  - HTTP: chat.tallman.com:80
  - HTTPS: chat.tallman.com:443
- Reverse proxy to localhost:3200

## 4. Firewall Rules
- Allow HTTP (80) and HTTPS (443) inbound
- Internal network access only

## 5. Client Certificate Trust
Users need to trust the self-signed certificate:
```
1. Browse to https://chat.tallman.com
2. Click "Advanced" -> "Proceed to chat.tallman.com"
3. Or install certificate in Trusted Root store
```